import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import json, os, glob
from datetime import datetime
from dotenv import load_dotenv

_script_dir = os.path.dirname(os.path.abspath(__file__))
_env_path = os.path.join(_script_dir, ".env")
load_dotenv(dotenv_path=_env_path)

# ── PAGE CONFIG ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="AquaMonitor India",
    page_icon="🌊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ── SESSION STATE ─────────────────────────────────────────────────────────────
for k, v in [("page", "Overview")]:
    if k not in st.session_state:
        st.session_state[k] = v

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
* { font-family: 'Inter', sans-serif; }
.stApp { background: #f0f5fb; color: #1a2a3a; }

[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #0b1f3a 0%, #0f2d52 100%) !important;
    border-right: 1px solid #1e3a5c;
}
[data-testid="stSidebar"] p,
[data-testid="stSidebar"] label,
[data-testid="stSidebar"] span { color: #a8c4e0 !important; font-size: 13px; }
[data-testid="stSidebar"] h1,
[data-testid="stSidebar"] h2 { color: #e8f4ff !important; }
[data-testid="stSidebar"] .stSelectbox > div > div {
    background: #0d2540 !important; border: 1px solid #1e4060 !important;
    color: #e8f4ff !important; border-radius: 8px !important;
}
[data-testid="stSidebar"] .stButton > button {
    background: transparent !important; color: #a8c4e0 !important;
    border: 1px solid #1e3a5c !important; border-radius: 8px !important;
    padding: 8px 14px !important; font-size: 13px !important;
    font-weight: 500 !important; margin-bottom: 2px !important;
    width: 100% !important;
}
[data-testid="stSidebar"] .stButton > button:hover {
    background: #1e3a5c !important; color: #e8f4ff !important;
}
.active-nav .stButton > button {
    background: linear-gradient(135deg,#1e88e5,#1565c0) !important;
    color: white !important; border-color: #1e88e5 !important;
    font-weight: 700 !important;
}
.metric-card { background:white; border:1px solid #dde8f2; border-radius:16px;
    padding:20px 14px; text-align:center;
    box-shadow:0 2px 10px rgba(0,60,120,.07); margin-bottom:10px; }
.station-card { background:white; border:1px solid #dde8f2; border-radius:14px;
    padding:18px; margin-bottom:14px; }
.info-box { background:#f0f7ff; border:1px solid #bdd6f0;
    border-left:4px solid #1e88e5; border-radius:10px;
    padding:14px 16px; margin-bottom:12px; }
.info-box h4 { color:#0a2540; margin:0 0 4px 0; font-size:15px; }
.info-box p  { color:#3a5a7a; margin:0; font-size:13px; line-height:1.6; }
.alert-critical { border-left:5px solid #e53935; background:#fff5f5;
    border-radius:8px; padding:12px 16px; margin:6px 0; }
.alert-warning  { border-left:5px solid #fb8c00; background:#fff8f0;
    border-radius:8px; padding:12px 16px; margin:6px 0; }
.tag { display:inline-block; border-radius:20px; padding:3px 12px;
    font-size:11px; font-weight:700; }
section.main .stButton > button {
    background: linear-gradient(135deg,#1e88e5,#0d47a1) !important;
    color:white !important; border:none !important;
    border-radius:8px !important; font-weight:600 !important; }
h1 { color:#0a2540 !important; font-weight:800 !important; }
h2,h3 { color:#1a3a5c !important; font-weight:700 !important; }
div[data-testid="stExpander"] { background:white; border:1px solid #dde8f2;
    border-radius:12px; margin-bottom:8px; }
</style>
""", unsafe_allow_html=True)

# ── CONSTANTS ─────────────────────────────────────────────────────────────────
BASE  = "backend"
NWMP  = os.path.join(BASE, "NWMP_Data")
GWP   = os.path.join(BASE, "groundwater_data")
RAINP = os.path.join(BASE, "rainfall_data")
YEARS  = ["2021", "2022", "2023"]
WTYPES = ["creek", "drains", "lakes", "medium_minor_rivers", "rivers"]
TLBL   = {"creek": "Creek", "drains": "Drain", "lakes": "Lake",
          "medium_minor_rivers": "Med/Minor River", "rivers": "River"}
TCLR   = {"Creek": "#f59e0b", "Drain": "#ef4444", "Lake": "#22c55e",
          "Med/Minor River": "#06b6d4", "River": "#3b82f6"}
PAL    = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6",
          "#06b6d4","#ec4899","#14b8a6","#f97316","#84cc16"]
CBG = "#ffffff"; CPP = "#f8fafc"; GRD = "#e2e8f0"; FC = "#1a2a3a"

# ── PARAMETER INFO ─────────────────────────────────────────────────────────────
# FIX: Added full Nitrate significance, health impact, and proper threshold text.
# Previously NO3 had threshold text but no significance in WQI or alerts.
PINFO = {
    "DO":  ("Dissolved Oxygen (DO)",
            "Oxygen dissolved in water — essential for fish, aquatic insects and aerobic bacteria to survive. "
            "Low DO indicates organic pollution consuming oxygen (dead zones). "
            "Rivers below 4 mg/L cannot sustain fish life.",
            "✅ Safe ≥6 mg/L | ⚠️ Warning <4 mg/L | 🔴 Critical <2 mg/L"),

    "BOD": ("Biochemical Oxygen Demand (BOD)",
            "Oxygen microbes need to break down organic waste — higher value = more sewage/industrial pollution. "
            "High BOD directly depletes DO, creating oxygen-starved water. "
            "A key indicator of untreated sewage discharge.",
            "✅ Safe ≤3 mg/L | ⚠️ Warning >10 mg/L | 🔴 Critical >30 mg/L"),

    "pH":  ("pH Level",
            "Acidity/alkalinity scale. 7 = neutral, <7 = acidic, >7 = alkaline. "
            "Extremes harm aquatic life — acidic water dissolves heavy metals (lead, mercury) making them more toxic. "
            "Alkaline water from industrial effluents can be equally damaging.",
            "✅ Safe 6.5–8.5 | ⚠️ Warning <6 or >9 | 🔴 Critical <5 or >10"),

    "FC":  ("Faecal Coliform",
            "Bacteria from human/animal intestinal waste — high levels confirm sewage contamination. "
            "Direct health risk: cholera, typhoid, diarrhoea, hepatitis A. "
            "India's rivers carry some of the world's highest FC counts due to open defecation and untreated sewage.",
            "✅ Safe ≤100 MPN/100mL | ⚠️ Warning >500 | 🔴 Critical >1000 MPN/100mL"),

    # FIX: Expanded significance — eutrophication, blue baby syndrome, agricultural runoff
    "NO3": ("Nitrate (NO₃)",
            "Excess nitrate — primarily from agricultural fertiliser runoff and sewage — triggers eutrophication: "
            "explosive algal blooms that block sunlight, deplete oxygen on decomposition, and create aquatic dead zones. "
            "At >45 mg/L in drinking water it causes methemoglobinemia (Blue Baby Syndrome) in infants under 6 months, "
            "a potentially fatal condition where nitrate prevents blood from carrying oxygen. "
            "Also linked to higher cancer risk in adults with prolonged exposure. "
            "India's agricultural states (Punjab, Haryana, UP) frequently exceed safe limits due to over-fertilisation. "
            "This parameter is included in the WQI score (10% weight) and triggers alerts at WHO thresholds.",
            "✅ Safe ≤45 mg/L | ⚠️ Warning >45 mg/L | 🔴 Critical >100 mg/L"),

    "WQI": ("Water Quality Index (WQI)",
            "Composite score 0–100 combining DO (25%), BOD (25%), pH (20%), Faecal Coliform (20%) "
            "and Nitrate (10%) into a single rating. "
            "Nitrate is now included because elevated nitrate frequently co-occurs with agricultural runoff "
            "and represents a distinct public health risk not captured by organic pollution indicators alone.",
            "🟢 Excellent 90–100 | 🟡 Good 70–89 | 🟠 Fair 50–69 | 🔴 Poor 30–49 | ⛔ Critical <30"),
}

STATE_MAP = {
    "andhra pradesh":"Andhra Pradesh","andhra":"Andhra Pradesh","ap":"Andhra Pradesh",
    "arunachal pradesh":"Arunachal Pradesh","arunachal":"Arunachal Pradesh",
    "assam":"Assam","bihar":"Bihar",
    "chhattisgarh":"Chhattisgarh","chattisgarh":"Chhattisgarh","chhatisgarh":"Chhattisgarh",
    "chhattishgarh":"Chhattisgarh","chattisgrah":"Chhattisgarh","chattishgarh":"Chhattisgarh",
    "chhatishgarh":"Chhattisgarh","chhatisgrah":"Chhattisgarh","chhattisgadh":"Chhattisgarh",
    "goa":"Goa","gujarat":"Gujarat","gujrat":"Gujarat",
    "haryana":"Haryana","hariyana":"Haryana",
    "himachal pradesh":"Himachal Pradesh","himachal":"Himachal Pradesh","hp":"Himachal Pradesh",
    "jharkhand":"Jharkhand","jharkand":"Jharkhand",
    "karnataka":"Karnataka","karnatka":"Karnataka",
    "kerala":"Kerala","kerela":"Kerala",
    "madhya pradesh":"Madhya Pradesh","madhyapradesh":"Madhya Pradesh","mp":"Madhya Pradesh",
    "maharashtra":"Maharashtra","maharastra":"Maharashtra",
    "manipur":"Manipur","meghalaya":"Meghalaya","mizoram":"Mizoram","nagaland":"Nagaland",
    "odisha":"Odisha","orissa":"Odisha","odhisha":"Odisha","punjab":"Punjab",
    "rajasthan":"Rajasthan","rajsthan":"Rajasthan","sikkim":"Sikkim",
    "tamil nadu":"Tamil Nadu","tamilnadu":"Tamil Nadu","tn":"Tamil Nadu",
    "telangana":"Telangana","telengana":"Telangana","telangna":"Telangana",
    "telagnana":"Telangana","telegana":"Telangana","telagana":"Telangana",
    "tripura":"Tripura",
    "uttar pradesh":"Uttar Pradesh","uttarpradesh":"Uttar Pradesh","up":"Uttar Pradesh",
    "uttarakhand":"Uttarakhand","uttaranchal":"Uttarakhand","uttranchal":"Uttarakhand",
    "uttrakhand":"Uttarakhand","uttrakand":"Uttarakhand","uttarakand":"Uttarakhand",
    "utranchal":"Uttarakhand",
    "west bengal":"West Bengal","westbengal":"West Bengal","wb":"West Bengal",
    "andaman and nicobar islands":"Andaman & Nicobar Islands",
    "andaman & nicobar islands":"Andaman & Nicobar Islands",
    "andaman and nicobar":"Andaman & Nicobar Islands",
    "andaman & nicobar":"Andaman & Nicobar Islands",
    "andaman nicobar":"Andaman & Nicobar Islands",
    "a & n islands":"Andaman & Nicobar Islands",
    "chandigarh":"Chandigarh","chandiagrh":"Chandigarh","chandigrah":"Chandigarh",
    "chandigarg":"Chandigarh","chandigar":"Chandigarh","chandighar":"Chandigarh",
    "chandihagrh":"Chandigarh","chandhigarh":"Chandigarh","chandigardh":"Chandigarh",
    "dadra and nagar haveli and daman and diu":"Dadra & NH and Daman & Diu",
    "dadra & nagar haveli and daman & diu":"Dadra & NH and Daman & Diu",
    "dadra and nagar haveli":"Dadra & NH and Daman & Diu",
    "dadra & nagar haveli":"Dadra & NH and Daman & Diu",
    "daman and diu":"Dadra & NH and Daman & Diu","daman & diu":"Dadra & NH and Daman & Diu",
    "dadra nagar haveli":"Dadra & NH and Daman & Diu",
    "delhi":"Delhi","new delhi":"Delhi","nct of delhi":"Delhi","nct delhi":"Delhi",
    "jammu and kashmir":"Jammu & Kashmir","jammu & kashmir":"Jammu & Kashmir",
    "j&k":"Jammu & Kashmir","j & k":"Jammu & Kashmir","jammu kashmir":"Jammu & Kashmir",
    "jammu and kashmir (state)":"Jammu & Kashmir","ladakh":"Ladakh",
    "lakshadweep":"Lakshadweep","lakshwadeep":"Lakshadweep","laskhwadeep":"Lakshadweep",
    "lakshadweeep":"Lakshadweep","lakshdweep":"Lakshadweep","lakshadeep":"Lakshadweep",
    "lakshadwip":"Lakshadweep","lakshadweep islands":"Lakshadweep",
    "puducherry":"Puducherry","pondicherry":"Puducherry","pondhicherry":"Puducherry",
    "puduchery":"Puducherry","pudhucherry":"Puducherry","puducherry (ut)":"Puducherry",
}

ALL_INDIA_STATES = [
    "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
    "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
    "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
    "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
    "Uttarakhand","West Bengal",
    "Andaman & Nicobar Islands","Chandigarh","Dadra & NH and Daman & Diu",
    "Delhi","Jammu & Kashmir","Ladakh","Lakshadweep","Puducherry"
]

# ── DATA LOADERS ──────────────────────────────────────────────────────────────
@st.cache_data(show_spinner=False)
def load_nwmp_file(yr, wt):
    p = os.path.join(NWMP, yr, f"{yr}_json", f"{wt}_{yr}.json")
    if not os.path.exists(p): return []
    with open(p, "r", encoding="utf-8") as f: raw = json.load(f)
    recs = raw if isinstance(raw, list) else next((v for v in raw.values() if isinstance(v, list)), [])
    for r in recs:
        r["_year"] = yr; r["_type"] = wt; r["_tlbl"] = TLBL.get(wt, wt)
    return recs

@st.cache_data(show_spinner=False)
def load_nwmp(years=None, types=None):
    years = years or YEARS; types = types or WTYPES
    rows = []
    for y in years:
        for t in types: rows.extend(load_nwmp_file(y, t))
    if not rows: return pd.DataFrame()
    df = pd.DataFrame(rows)
    cm = {}
    for c in df.columns:
        cl = c.lower().strip()
        if cl in ("station_code","stationcode","code"):                                  cm[c] = "station_code"
        elif cl in ("location_name","locationname","name","station_name","stationname"): cm[c] = "loc"
        elif cl in ("water_body_type","waterbodytype","type","body_type"):               cm[c] = "wbtype"
        elif cl == "state":                                                               cm[c] = "state"
        elif cl in ("do_min","domin"):       cm[c] = "do_min"
        elif cl in ("do_max","domax"):       cm[c] = "do_max"
        elif cl in ("ph_min","phmin"):       cm[c] = "ph_min"
        elif cl in ("ph_max","phmax"):       cm[c] = "ph_max"
        elif cl in ("bod_min","bodmin"):     cm[c] = "bod_min"
        elif cl in ("bod_max","bodmax"):     cm[c] = "bod_max"
        elif cl in ("nitrate_min","nitratemin"): cm[c] = "no3_min"
        elif cl in ("nitrate_max","nitratemax"): cm[c] = "no3_max"
        elif cl in ("faecal_min","faecalmin","fcmin"): cm[c] = "fc_min"
        elif cl in ("faecal_max","faecalmax","fcmax"):  cm[c] = "fc_max"
        elif cl in ("temp_min","tempmin"):   cm[c] = "temp_min"
        elif cl in ("temp_max","tempmax"):   cm[c] = "temp_max"
        elif cl in ("cond_min","condmin"):   cm[c] = "cond_min"
        elif cl in ("cond_max","condmax"):   cm[c] = "cond_max"
    df = df.rename(columns=cm)
    for c in ["do_min","do_max","ph_min","ph_max","bod_min","bod_max","fc_min","fc_max",
              "no3_min","no3_max","temp_min","temp_max","cond_min","cond_max"]:
        if c not in df.columns: df[c] = float("nan")
        else: df[c] = pd.to_numeric(df[c], errors="coerce")
    for c in ["station_code","loc","wbtype","state"]:
        if c not in df.columns: df[c] = ""
        else: df[c] = df[c].astype(str).str.strip()
    mask = df["wbtype"].isin(["","nan","None"])
    if "_tlbl" in df.columns: df.loc[mask, "wbtype"] = df.loc[mask, "_tlbl"]
    def _norm(s):
        s = str(s).strip()
        mapped = STATE_MAP.get(s.lower())
        if mapped: return mapped
        cleaned = "".join(c for c in s.lower() if c.isalpha() or c == " ").strip()
        mapped = STATE_MAP.get(cleaned)
        if mapped: return mapped
        for official in ALL_INDIA_STATES:
            if official.lower() in s.lower() or s.lower() in official.lower():
                return official
        return None
    df["state"] = df["state"].apply(_norm)
    df = df[df["state"].notna()]
    return df

@st.cache_data(show_spinner=False)
def load_gw():
    files = glob.glob(os.path.join(GWP, "*.json"))
    rows = []
    for fp in files:
        with open(fp, "r", encoding="utf-8") as f: raw = json.load(f)
        sn = raw.get("state", os.path.basename(fp).replace(".json",""))
        for dn, dv in raw.get("districts", {}).items():
            recs = dv.get("data",[]) if isinstance(dv,dict) else dv
            for r in recs: r["_state"] = sn; r["_dist"] = dn; rows.append(r)
    if not rows: return pd.DataFrame()
    df = pd.DataFrame(rows)
    for c in ["dataValue","wellDepth"]:
        if c in df.columns: df[c] = pd.to_numeric(df[c], errors="coerce")
    if "_state" in df.columns:
        df["_state"] = df["_state"].apply(lambda s: STATE_MAP.get(str(s).lower().strip()) or
            next((o for o in ALL_INDIA_STATES if o.lower() in str(s).lower() or str(s).lower() in o.lower()), None))
        df = df[df["_state"].notna()]
    return df

@st.cache_data(show_spinner=False)
def load_rain():
    files = glob.glob(os.path.join(RAINP, "*.json"))
    rows = []
    for fp in files:
        with open(fp, "r", encoding="utf-8") as f: raw = json.load(f)
        sn = raw.get("state", os.path.basename(fp).replace(".json",""))
        for dn, dv in raw.get("districts", {}).items():
            recs = dv.get("data",[]) if isinstance(dv,dict) else dv
            for r in recs: r["_state"] = sn; r["_dist"] = dn; rows.append(r)
    if not rows: return pd.DataFrame()
    df = pd.DataFrame(rows)
    if "dataValue" in df.columns: df["dataValue"] = pd.to_numeric(df["dataValue"], errors="coerce")
    if "_state" in df.columns:
        df["_state"] = df["_state"].apply(lambda s: STATE_MAP.get(str(s).lower().strip()) or
            next((o for o in ALL_INDIA_STATES if o.lower() in str(s).lower() or str(s).lower() in o.lower()), None))
        df = df[df["_state"].notna()]
    return df

# ── WQI ───────────────────────────────────────────────────────────────────────
# FIX: Nitrate (NO3) is now included in WQI with 10% weight.
# Old weights: DO=30%, pH=20%, BOD=30%, FC=20%  → total=100%, NO3 ignored
# New weights: DO=25%, pH=20%, BOD=25%, FC=20%, NO3=10% → total=100%
# Rationale: Nitrate is a distinct public health risk (Blue Baby Syndrome,
# eutrophication) not captured by BOD/FC. Agricultural runoff in India
# (Punjab, Haryana, UP) frequently pushes NO3 above safe limits even when
# other parameters are acceptable. Adding it at 10% reflects its importance
# without over-shadowing the primary organic pollution indicators.
def calc_wqi(row):
    try:
        do  = row.get("do_min",  float("nan"))
        p1  = row.get("ph_min",  float("nan"))
        p2  = row.get("ph_max",  float("nan"))
        bd  = row.get("bod_max", float("nan"))
        fc  = row.get("fc_max",  float("nan"))
        no3 = row.get("no3_max", float("nan"))   # FIX: was never read before

        # Dissolved Oxygen score (higher DO = better)
        ds = (100 if do >= 6 else (70 if do >= 4 else 30)) if pd.notna(do) else 50

        # pH score (safe range 6.5–8.5)
        ps = 100 if (pd.notna(p1) and pd.notna(p2) and 6.5 <= p1 and p2 <= 8.5) else 50

        # BOD score (lower BOD = better)
        bs = (100 if bd <= 3 else (60 if bd <= 6 else 20)) if pd.notna(bd) else 50

        # Faecal Coliform score (lower FC = better)
        fs = (100 if fc <= 100 else (50 if fc <= 500 else 10)) if pd.notna(fc) else 50

        # Nitrate score (lower NO3 = better)
        # Negative values are sensor anomalies — treated as missing (score=50, neutral)
        # ≤45 mg/L → safe (WHO drinking water guideline)
        # ≤100 mg/L → borderline (eutrophication risk)
        # >100 mg/L → critical (Blue Baby Syndrome risk, dead zones)
        ns = (100 if no3 <= 45 else (50 if no3 <= 100 else 10)) if (pd.notna(no3) and no3 >= 0) else 50

        # FIX: Revised weights — DO 25%, pH 20%, BOD 25%, FC 20%, NO3 10%
        return round(ds * 0.25 + ps * 0.20 + bs * 0.25 + fs * 0.20 + ns * 0.10)
    except:
        return 50

def wlbl(w):
    if w >= 90: return "Excellent", "#16a34a"
    if w >= 70: return "Good",      "#65a30d"
    if w >= 50: return "Fair",      "#d97706"
    if w >= 30: return "Poor",      "#dc2626"
    return "Critical", "#991b1b"

# ── ALERTS ────────────────────────────────────────────────────────────────────
# FIX: Added nitrate alert checks — both WARNING (>45 mg/L) and CRITICAL (>100 mg/L).
# Previously make_alerts() only checked BOD, FC and DO. Nitrate was completely
# absent from the alert engine despite being listed in the WHO reference table.
def make_alerts(df):
    al = []
    if df.empty: return al
    for _, row in df.iterrows():
        nm   = str(row.get("loc","?"))[:55]
        st_n = str(row.get("state",""))
        yr   = str(row.get("_year",""))
        bd   = row.get("bod_max",  float("nan"))
        fc   = row.get("fc_max",   float("nan"))
        do   = row.get("do_min",   float("nan"))
        no3  = row.get("no3_max",  float("nan"))   # FIX: read nitrate

        # BOD alerts
        if pd.notna(bd) and bd > 30:
            al.append({"type":"CRITICAL","msg":f"BOD critically high ({bd:.1f} mg/L)","station":nm,"state":st_n,"param":"BOD","yr":yr})
        elif pd.notna(bd) and bd > 10:
            al.append({"type":"WARNING","msg":f"Elevated BOD ({bd:.1f} mg/L)","station":nm,"state":st_n,"param":"BOD","yr":yr})

        # Faecal Coliform alerts
        if pd.notna(fc) and fc > 1000:
            al.append({"type":"CRITICAL","msg":f"Faecal coliform very high ({fc:.0f} MPN/100mL)","station":nm,"state":st_n,"param":"FC","yr":yr})
        elif pd.notna(fc) and fc > 500:
            al.append({"type":"WARNING","msg":f"High faecal coliform ({fc:.0f} MPN/100mL)","station":nm,"state":st_n,"param":"FC","yr":yr})

        # Dissolved Oxygen alerts
        if pd.notna(do) and do < 4:
            al.append({"type":"CRITICAL","msg":f"Dangerously low DO ({do:.1f} mg/L)","station":nm,"state":st_n,"param":"DO","yr":yr})

        # Nitrate alerts — only for physically valid values (no3 >= 0)
        # Negative nitrate = sensor/data error → skip alert, shown grey in chart
        if pd.notna(no3) and no3 >= 0:
            if no3 > 100:
                al.append({"type":"CRITICAL",
                           "msg":f"Nitrate critically high ({no3:.1f} mg/L) — Blue Baby Syndrome risk",
                           "station":nm,"state":st_n,"param":"NO3","yr":yr})
            elif no3 > 45:
                al.append({"type":"WARNING",
                           "msg":f"Nitrate above WHO limit ({no3:.1f} mg/L) — eutrophication risk",
                           "station":nm,"state":st_n,"param":"NO3","yr":yr})

    return al[:50]

# ── CHART HELPERS ─────────────────────────────────────────────────────────────
def _layout(fig, h=380, b=90, l=50, ta=-30):
    fig.update_layout(paper_bgcolor=CPP, plot_bgcolor=CBG, font_color=FC, height=h,
                      xaxis=dict(gridcolor=GRD, tickangle=ta), yaxis=dict(gridcolor=GRD),
                      margin=dict(t=50, b=b, l=l, r=20))
    return fig

def make_gauge(v):
    lb, cl = wlbl(v)
    fig = go.Figure(go.Indicator(
        mode="gauge+number", value=v,
        title={"text": f"WQI<br><span style='font-size:11px;color:{cl}'>{lb}</span>", "font": {"color": FC, "size": 12}},
        number={"font": {"color": cl, "size": 28}},
        gauge={"axis": {"range": [0,100], "tickcolor": "#94a3b8", "tickfont": {"color": "#64748b", "size": 9}},
               "bar": {"color": cl, "thickness": .3}, "bgcolor": "#f1f5f9", "bordercolor": "#cbd5e1",
               "steps": [{"range":[0,30],"color":"#fee2e2"},{"range":[30,50],"color":"#fef3c7"},
                         {"range":[50,70],"color":"#fefce8"},{"range":[70,90],"color":"#dcfce7"},
                         {"range":[90,100],"color":"#d1fae5"}],
               "threshold": {"line": {"color": cl, "width": 3}, "thickness": .75, "value": v}}))
    fig.update_layout(paper_bgcolor=CPP, plot_bgcolor=CBG, height=190, margin=dict(t=25, b=0, l=15, r=15))
    return fig

def make_pie(labels, values, title, colors=None):
    clrs = colors or PAL
    fig = go.Figure(go.Pie(labels=labels, values=values,
                           marker=dict(colors=clrs[:len(labels)]),
                           hole=.45, textinfo="label+percent", textfont=dict(size=11, color=FC)))
    fig.update_layout(title=dict(text=title, font=dict(color=FC, size=14)),
                      paper_bgcolor=CPP, font_color=FC, height=330,
                      margin=dict(t=50, b=10, l=10, r=10), legend=dict(bgcolor=CBG))
    return fig

def make_hbar(labels, vals, title, colors, xlabel="", h=400):
    short = [l[:35]+"…" if len(l)>35 else l for l in labels]
    fig = go.Figure(go.Bar(y=short, x=vals, orientation="h", marker_color=colors,
                           text=[f"{v:.1f}" if pd.notna(v) else "" for v in vals],
                           textposition="outside", customdata=labels,
                           hovertemplate="<b>%{customdata}</b><br>"+xlabel+": %{x:.2f}<extra></extra>"))
    fig.update_layout(title=dict(text=title, font=dict(color=FC, size=14)), xaxis_title=xlabel,
                      paper_bgcolor=CPP, plot_bgcolor=CBG, font_color=FC, height=h,
                      xaxis=dict(gridcolor=GRD), yaxis=dict(gridcolor=GRD),
                      margin=dict(t=50, b=30, l=220, r=70))
    return fig

def make_line(piv, title, ylabel=""):
    fig = go.Figure()
    for i, c in enumerate(piv.columns):
        fig.add_trace(go.Scatter(x=piv.index.tolist(), y=piv[c].tolist(), name=str(c),
                                 mode="lines+markers",
                                 line=dict(color=PAL[i%len(PAL)], width=2.5),
                                 marker=dict(size=8)))
    fig.update_layout(title=dict(text=title, font=dict(color=FC, size=14)), yaxis_title=ylabel,
                      legend=dict(bgcolor=CBG, bordercolor=GRD))
    return _layout(fig, 360, 30, 50, 0)

def ibox(key):
    nm, desc, thr = PINFO[key]
    st.markdown(f'<div class="info-box"><h4>ℹ️ {nm}</h4>'
                f'<p>{desc}<br><strong>Thresholds →</strong> {thr}</p></div>',
                unsafe_allow_html=True)

def mcard(icon, val, label, color):
    return (f'<div class="metric-card">'
            f'<div style="font-size:26px">{icon}</div>'
            f'<div style="font-size:28px;font-weight:800;color:{color}">{val}</div>'
            f'<div style="font-size:11px;color:#64748b;margin-top:4px">{label}</div>'
            f'</div>')

def safe_df(df_in, cols):
    cols = [c for c in cols if c in df_in.columns]
    out = df_in[cols].copy()
    for c in out.columns: out[c] = out[c].astype(str)
    return out

# ── LOAD DATA ─────────────────────────────────────────────────────────────────
with st.spinner("Loading data..."):
    df_all  = load_nwmp(YEARS, WTYPES)
    df_gw   = load_gw()
    df_rain = load_rain()

if not df_all.empty:
    df_all["wqi"] = df_all.apply(calc_wqi, axis=1)
    df_all["wql"] = df_all["wqi"].apply(lambda x: wlbl(x)[0])

# ── SIDEBAR ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🌊 AquaMonitor India")

    st.markdown("---")
    data_states = set(df_all["state"].dropna().unique()) if not df_all.empty else set()
    clean_states = [s for s in ALL_INDIA_STATES if s in data_states]
    sel_state = st.selectbox("🗺️ State", ["All States"] + clean_states)

    type_opts = ["All Types"] + [TLBL[t] for t in WTYPES]
    sel_tlbl  = st.selectbox("💧 Water Body Type", type_opts)
    sel_type  = None if sel_tlbl == "All Types" else sel_tlbl

    df_pool = df_all.copy()
    if not df_pool.empty:
        if sel_state != "All States": df_pool = df_pool[df_pool["state"] == sel_state]
        if sel_type:                  df_pool = df_pool[df_pool["_tlbl"] == sel_type]
    stn_opts = ["All Stations"]
    if not df_pool.empty and "loc" in df_pool.columns:
        stn_opts += sorted(df_pool["loc"].dropna().unique().tolist())[:400]
    sel_stn = st.selectbox("📍 Water Station", stn_opts)

    st.markdown("---")
    st.markdown("**Navigation**")

    NAV = [("🏠", "Overview"), ("💧", "Water Quality"), ("🕳️", "Groundwater"),
           ("🌧️", "Rainfall"), ("🚨", "Alerts"), ("🏢", "NGO Dashboard"), ("📈", "Trends")]

    for icon, name in NAV:
        is_active = st.session_state.page == name
        if is_active:
            st.markdown('<div class="active-nav">', unsafe_allow_html=True)
        if st.button(f"{icon}  {name}", key=f"nav_{name}", use_container_width=True):
            st.session_state.page = name
            st.rerun()
        if is_active:
            st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("---")
    if st.button("🔄 Clear Cache & Reload", use_container_width=True, key="clear_cache"):
        st.cache_data.clear()
        st.rerun()

page = st.session_state.page

# ── APPLY FILTERS ─────────────────────────────────────────────────────────────
df = df_all.copy()
if not df.empty:
    if sel_state != "All States": df = df[df["state"] == sel_state]
    if sel_type:                   df = df[df["_tlbl"] == sel_type]
    if sel_stn != "All Stations":  df = df[df["loc"] == sel_stn]

alerts  = make_alerts(df)
avg_wqi = int(df["wqi"].mean()) if not df.empty else 0
crit_n  = sum(1 for a in alerts if a["type"] == "CRITICAL")
awl, awc = wlbl(avg_wqi)

# ═══════════════════════════════════════════════════════════════════════════════
# OVERVIEW
# ═══════════════════════════════════════════════════════════════════════════════
if page == "Overview":
    st.title("🌊 AquaMonitor India — Dashboard")
    st.caption(f"Filter active: {sel_state} · {sel_tlbl} · {sel_stn}")

    c1, c2, c3, c4, c5 = st.columns(5)
    for col, (ic, v, lb, cl) in zip([c1,c2,c3,c4,c5], [
        ("📡", f"{len(df):,}",       "NWMP Stations",      "#1e88e5"),
        ("🕳️", f"{len(df_gw):,}",    "GW Records",         "#16a34a"),
        ("🌧️", f"{len(df_rain):,}",  "Rainfall Records",   "#d97706"),
        ("🚨", str(crit_n),          "Critical Alerts",    "#dc2626"),
        ("📊", f"{avg_wqi}",         f"Avg WQI — {awl}",  awc)]):
        col.markdown(mcard(ic, v, lb, cl), unsafe_allow_html=True)

    if df.empty:
        st.warning("No data loaded. Check your backend folder path.")
        st.stop()

    st.markdown("---")
    col_l, col_r = st.columns(2)
    with col_l:
        wd = df["wql"].value_counts()
        wc = {"Excellent":"#16a34a","Good":"#65a30d","Fair":"#d97706","Poor":"#dc2626","Critical":"#991b1b"}
        st.plotly_chart(make_pie(wd.index.tolist(), wd.values.tolist(), "WQI Distribution",
                                 [wc.get(l,"#3b82f6") for l in wd.index]),
                        use_container_width=True, key="pc_wqi_pie")
    with col_r:
        if "_tlbl" in df.columns:
            td = df["_tlbl"].value_counts()
            st.plotly_chart(make_pie(td.index.tolist(), td.values.tolist(), "Stations by Water Body Type",
                                     [TCLR.get(l,"#3b82f6") for l in td.index]),
                            use_container_width=True, key="pc_type_pie")

    st.markdown("---")
    st.subheader("🗺️ Average WQI by State")
    st.markdown("<p style='color:#64748b;font-size:13px'>Lower score = worse quality.</p>", unsafe_allow_html=True)
    if "state" in df.columns:
        sw = df.groupby("state")["wqi"].mean().round(1).sort_values()
        sw = sw[sw.index.str.strip() != ""]
        fig = go.Figure(go.Bar(
            x=sw.index.tolist(), y=sw.values.tolist(),
            marker_color=[wlbl(v)[1] for v in sw.values],
            text=[str(v) for v in sw.values], textposition="outside",
            hovertemplate="<b>%{x}</b><br>Avg WQI: %{y}<extra></extra>"))
        fig.add_hline(y=50, line_dash="dash", line_color="#d97706", annotation_text="Fair (50)")
        fig.add_hline(y=70, line_dash="dash", line_color="#16a34a", annotation_text="Good (70)")
        fig.update_layout(yaxis_title="Avg WQI", yaxis_range=[0,125])
        st.plotly_chart(_layout(fig, 420, 90), use_container_width=True, key="pc_3")

    st.markdown("---")
    st.subheader("💧 WQI by Water Body Type per State")
    if "state" in df.columns and "_tlbl" in df.columns:
        pv = df.groupby(["state","_tlbl"])["wqi"].mean().round(1).unstack("_tlbl")
        pv = pv[pv.index.str.strip() != ""]
        if not pv.empty:
            fig2 = go.Figure()
            for i, cn in enumerate(pv.columns):
                fig2.add_trace(go.Bar(name=cn, x=pv.index.tolist(), y=pv[cn].tolist(),
                                      marker_color=PAL[i%len(PAL)],
                                      hovertemplate="<b>%{x}</b><br>"+cn+": %{y:.1f}<extra></extra>"))
            fig2.update_layout(barmode="group", yaxis_title="Avg WQI", yaxis_range=[0,120],
                               legend=dict(bgcolor=CBG, bordercolor=GRD))
            st.plotly_chart(_layout(fig2, 420, 90), use_container_width=True, key="pc_4")

    st.markdown("---")
    st.subheader("🔀 Station Comparison")
    ibox("WQI")
    pool = df["loc"].dropna().unique().tolist()[:400] if not df.empty else []
    if len(pool) >= 2:
        cc1, cc2 = st.columns(2)
        sA = cc1.selectbox("Station A", pool, key="cmpA")
        sB = cc2.selectbox("Station B", pool, index=min(1, len(pool)-1), key="cmpB")
        rA = df[df["loc"] == sA].iloc[0]
        rB = df[df["loc"] == sB].iloc[0]
        # FIX: Added no3_max to the comparison bar chart
        pcols = ["do_max","bod_max","ph_max","fc_max","no3_max"]
        plabs = ["DO (mg/L)","BOD (mg/L)","pH","Faecal Coliform (MPN/100mL)","Nitrate (mg/L)"]
        vA = [float(rA.get(p,0)) if pd.notna(rA.get(p)) else 0 for p in pcols]
        vB = [float(rB.get(p,0)) if pd.notna(rB.get(p)) else 0 for p in pcols]
        wA = calc_wqi(rA.to_dict()); wB = calc_wqi(rB.to_dict())
        figC = go.Figure()
        figC.add_trace(go.Bar(name=sA[:40], x=plabs, y=vA, marker_color="#3b82f6"))
        figC.add_trace(go.Bar(name=sB[:40], x=plabs, y=vB, marker_color="#f59e0b"))
        figC.update_layout(barmode="group", legend=dict(bgcolor=CBG))
        st.plotly_chart(_layout(figC, 380, 60), use_container_width=True, key="pc_5")
        ga, gb = st.columns(2)
        with ga:
            st.plotly_chart(make_gauge(wA), use_container_width=True, key="gauge_cmpA")
            st.caption(f"**{sA[:60]}**")
        with gb:
            st.plotly_chart(make_gauge(wB), use_container_width=True, key="gauge_cmpB")
            st.caption(f"**{sB[:60]}**")
    else:
        st.info("Select filters with at least 2 stations for comparison.")

    st.markdown("---")
    st.subheader("🚨 Active Alerts")
    if alerts:
        for a in alerts[:6]:
            cls = f"alert-{a['type'].lower()}"
            ico = {"CRITICAL":"🔴","WARNING":"🟠"}.get(a["type"],"🔵")
            st.markdown(
                f'<div class="{cls}"><b>{ico} [{a["type"]}] {a["msg"]}</b><br>'
                f'<small style="color:#64748b">📍 {a["station"]} · 🗺️ {a["state"]} · ⚗️ {a["param"]} · 📅 {a["yr"]}</small></div>',
                unsafe_allow_html=True)
    else:
        st.success("✅ No critical alerts in current selection.")

# ═══════════════════════════════════════════════════════════════════════════════
# WATER QUALITY
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Water Quality":
    st.title("💧 Water Quality Monitoring")
    st.markdown("<p style='color:#64748b'>Detailed NWMP parameter analysis.</p>", unsafe_allow_html=True)
    if df.empty: st.warning("No data — adjust sidebar filters."); st.stop()
    st.caption(f"{len(df):,} records · {sel_state} · {sel_tlbl} · {sel_stn}")

    tab1, tab2, tab3, tab4, tab5 = st.tabs(["🫁 Dissolved Oxygen","🧪 BOD","⚗️ pH","🦠 Faecal Coliform","🌿 Nitrate"])

    def _ptab(pkey, mxcol, color, ylabel, chart_key, n=15):
        ibox(pkey)
        sub = df.dropna(subset=[mxcol]).nlargest(n, mxcol)
        if sub.empty: st.info("No data for this parameter."); return
        st.plotly_chart(make_hbar(sub["loc"].tolist(), sub[mxcol].tolist(),
                                  f"Top {n} Stations — {ylabel} (Max)", [color]*len(sub), ylabel, 420),
                        use_container_width=True, key=chart_key)
        with st.expander("📋 Full data table"):
            cols = ["loc","state","_tlbl","_year","wqi","wql"] + \
                   [c for c in [mxcol.replace("_max","_min"), mxcol] if c in df.columns]
            st.dataframe(safe_df(df, cols).rename(columns={"loc":"Station","state":"State",
                "_tlbl":"Type","_year":"Year","wqi":"WQI","wql":"Quality"}),
                use_container_width=True, hide_index=True, height=260)

    with tab1: _ptab("DO",  "do_max",  "#1e88e5", "DO (mg/L)",                  "ptab_do")
    with tab2: _ptab("BOD", "bod_max", "#dc2626", "BOD (mg/L)",                 "ptab_bod")
    with tab3: _ptab("pH",  "ph_max",  "#16a34a", "pH",                         "ptab_ph")
    with tab4: _ptab("FC",  "fc_max",  "#d97706", "Faecal Coliform (MPN/100mL)","ptab_fc")

    # Nitrate tab — 4-colour system with full legend and negative value handling
    with tab5:
        ibox("NO3")
        sub_no3 = df.dropna(subset=["no3_max"]).nlargest(15, "no3_max")
        if sub_no3.empty:
            st.info("No nitrate data available in current selection.")
        else:
            # ── COLOUR LEGEND ──────────────────────────────────────────────
            # The chart uses 4 distinct colours, each with a specific meaning:
            #
            #  🩶 GREY   (#94a3b8) — Negative value (< 0 mg/L)
            #                        Instrument error or sensor malfunction.
            #                        Nitrate cannot physically be negative.
            #                        These readings should be flagged for
            #                        data quality review and excluded from
            #                        WQI scoring.
            #
            #  🟢 GREEN  (#16a34a) — Safe / Borderline-safe (0 – 45 mg/L)
            #                        At or below WHO drinking water guideline.
            #                        Aquatic ecosystem not at eutrophication
            #                        risk. Safe for infant consumption.
            #                        Note: a bar at exactly 45.0 appears green
            #                        because it just touches the limit without
            #                        exceeding it (strict > 45 triggers orange).
            #
            #  🟠 ORANGE (#d97706) — Warning (> 45 mg/L and ≤ 100 mg/L)
            #                        Exceeds WHO guideline. Eutrophication and
            #                        algal bloom risk. Not safe as drinking
            #                        water for infants. Agricultural runoff
            #                        likely. Monitoring intervention required.
            #
            #  🟣 PURPLE (#7c3aed) — Critical (> 100 mg/L)
            #                        Severely elevated. High Blue Baby Syndrome
            #                        (methemoglobinemia) risk for infants < 6
            #                        months. Severe eutrophication. Immediate
            #                        remediation and public health alert needed.
            # ──────────────────────────────────────────────────────────────

            def _no3_color(v):
                if v < 0:   return "#94a3b8"   # grey  — negative (data anomaly)
                if v > 100: return "#7c3aed"   # purple — critical
                if v > 45:  return "#d97706"   # orange — warning
                return "#16a34a"               # green  — safe / borderline-safe

            no3_colors = [_no3_color(v) for v in sub_no3["no3_max"]]

            # Hover text shows status label per bar
            def _no3_status(v):
                if v < 0:   return "⚫ Data Anomaly (negative)"
                if v > 100: return "🔴 CRITICAL — Blue Baby risk"
                if v > 45:  return "⚠️ WARNING — Exceeds WHO limit"
                return "✅ Safe / Borderline-safe"

            hover_status = [_no3_status(v) for v in sub_no3["no3_max"]]

            fig_no3 = go.Figure(go.Bar(
                y=[l[:35]+"…" if len(l)>35 else l for l in sub_no3["loc"].tolist()],
                x=sub_no3["no3_max"].tolist(),
                orientation="h",
                marker_color=no3_colors,
                text=[f"{v:.1f}" for v in sub_no3["no3_max"]],
                textposition="outside",
                customdata=list(zip(sub_no3["loc"].tolist(), hover_status)),
                hovertemplate=(
                    "<b>%{customdata[0]}</b><br>"
                    "Nitrate: %{x:.2f} mg/L<br>"
                    "Status: %{customdata[1]}<extra></extra>"
                )
            ))

            # WHO & critical reference lines
            fig_no3.add_vline(x=45,  line_dash="dash", line_color="#d97706", line_width=2,
                              annotation_text="WHO Limit (45 mg/L)",
                              annotation_position="top right",
                              annotation_font_color="#d97706")
            fig_no3.add_vline(x=100, line_dash="dash", line_color="#7c3aed", line_width=2,
                              annotation_text="Critical (100 mg/L)",
                              annotation_position="top right",
                              annotation_font_color="#7c3aed")

            fig_no3.update_layout(
                title=dict(text="Top 15 Stations — Nitrate NO₃ (Max)", font=dict(color=FC, size=14)),
                xaxis_title="Nitrate (mg/L)",
                paper_bgcolor=CPP, plot_bgcolor=CBG, font_color=FC, height=480,
                xaxis=dict(gridcolor=GRD),
                yaxis=dict(gridcolor=GRD),
                margin=dict(t=50, b=30, l=220, r=80)
            )
            st.plotly_chart(fig_no3, use_container_width=True, key="ptab_no3_custom")

            # ── COLOUR LEGEND displayed below the chart ────────────────────
            st.markdown("""
<div style="display:flex;gap:24px;flex-wrap:wrap;padding:10px 0 4px;font-size:13px;align-items:center">
  <div><span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:#94a3b8;margin-right:6px;vertical-align:middle"></span><b>Grey</b> — Negative value (data/sensor error)</div>
  <div><span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:#16a34a;margin-right:6px;vertical-align:middle"></span><b>Green</b> — Safe / Borderline-safe (0–45 mg/L)</div>
  <div><span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:#d97706;margin-right:6px;vertical-align:middle"></span><b>Orange</b> — Warning: Exceeds WHO limit (45–100 mg/L)</div>
  <div><span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:#7c3aed;margin-right:6px;vertical-align:middle"></span><b>Purple</b> — Critical: Blue Baby Syndrome risk (&gt;100 mg/L)</div>
</div>
""", unsafe_allow_html=True)

            # ── SUMMARY METRICS ────────────────────────────────────────────
            n_neg  = (sub_no3["no3_max"] < 0).sum()
            n_safe = ((sub_no3["no3_max"] >= 0) & (sub_no3["no3_max"] <= 45)).sum()
            n_warn = ((sub_no3["no3_max"] > 45) & (sub_no3["no3_max"] <= 100)).sum()
            n_crit = (sub_no3["no3_max"] > 100).sum()
            s1, s2, s3, s4, s5 = st.columns(5)
            s1.metric("Stations Shown", len(sub_no3))
            s2.metric("🩶 Anomaly (<0)", n_neg)
            s3.metric("🟢 Safe (0–45)", n_safe)
            s4.metric("🟠 Warning (>45)", n_warn)
            s5.metric("🟣 Critical (>100)", n_crit)

            # Warning note if negative values are present
            if n_neg > 0:
                st.warning(
                    f"⚠️ **{n_neg} station(s)** have negative nitrate readings (shown in grey). "
                    "Nitrate cannot be negative — this indicates sensor malfunction, calibration error, "
                    "or a data entry issue. These values are excluded from alert thresholds but are "
                    "displayed for data quality awareness. Flag these stations for field inspection."
                )

            with st.expander("📋 Full nitrate data table"):
                no3_cols = ["loc","state","_tlbl","_year","no3_min","no3_max","wqi","wql"]
                full_no3 = df.dropna(subset=["no3_max"]).sort_values("no3_max", ascending=False)
                full_no3 = safe_df(full_no3, no3_cols).rename(columns={
                    "loc":"Station","state":"State","_tlbl":"Type","_year":"Year",
                    "no3_min":"NO3 Min","no3_max":"NO3 Max","wqi":"WQI","wql":"Quality"})
                st.dataframe(full_no3, use_container_width=True, hide_index=True, height=260)

    st.markdown("---")
    st.subheader("🔍 Station Deep Dive")
    stns = df["loc"].dropna().unique().tolist()[:400] if "loc" in df.columns else []
    if stns:
        sel_dd = st.selectbox("Select Station", stns, key="dd_stn")
        srow = df[df["loc"] == sel_dd].iloc[0]
        wv   = int(df[df["loc"] == sel_dd]["wqi"].mean())
        g1, g2 = st.columns([1,2])
        with g1: st.plotly_chart(make_gauge(wv), use_container_width=True, key="gauge_dd")
        with g2:
            pmap = {"State":"state","Type":"_tlbl","Year":"_year",
                    "DO Max (mg/L)":"do_max","pH Min–Max":"","BOD Max (mg/L)":"bod_max",
                    "Faecal Max (MPN)":"fc_max",
                    "Nitrate Max (mg/L)":"no3_max",   # FIX: was present but now shown with context
                    "Conductivity Max":"cond_max","Temp Min (°C)":"temp_min","Temp Max (°C)":"temp_max"}
            rows = []
            for label, col in pmap.items():
                if col == "": val = f"{srow.get('ph_min','')} – {srow.get('ph_max','')}"
                else:         val = str(srow.get(col,""))
                # Flag nitrate value with status label in deep dive (4 states)
                if col == "no3_max" and val not in ("", "nan", "None"):
                    try:
                        nv = float(val)
                        if nv < 0:    flag = " 🩶 DATA ANOMALY (negative — sensor error)"
                        elif nv > 100: flag = " 🔴 CRITICAL (Blue Baby risk)"
                        elif nv > 45:  flag = " ⚠️ WARNING (exceeds WHO limit)"
                        else:          flag = " ✅ Safe"
                        val = f"{nv:.1f}{flag}"
                    except: pass
                rows.append({"Parameter":label,"Value":val})
            st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True, height=320)

# ═══════════════════════════════════════════════════════════════════════════════
# GROUNDWATER
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Groundwater":
    st.title("🕳️ Groundwater Monitoring")
    st.markdown('<div class="info-box"><h4>ℹ️ Groundwater Levels</h4>'
                '<p>Negative value = water table is below surface. More negative = deeper = greater depletion.</p></div>',
                unsafe_allow_html=True)
    if df_gw.empty: st.warning(f"No files in {GWP}"); st.stop()

    gw_states = ["All States"] + sorted(df_gw["_state"].dropna().unique().tolist())
    g_st = st.selectbox("Select State", gw_states, key="gw_st")
    gv   = df_gw[df_gw["_state"] == g_st].copy() if g_st != "All States" else df_gw.copy()

    gcol  = "stationName" if "stationName" in gv.columns else "_dist"
    gstns = ["All Stations"] + sorted(gv[gcol].dropna().unique().tolist())[:300]
    g_stn = st.selectbox("Select Station", gstns, key="gw_stn")
    if g_stn != "All Stations": gv = gv[gv[gcol] == g_stn]
    st.caption(f"{len(gv):,} records")

    show_c = [c for c in ["stationCode","stationName","_dist","_state","dataValue","unit","wellType","wellDepth","aquiferType"] if c in gv.columns]
    with st.expander("📋 Data Table", expanded=False):
        st.dataframe(safe_df(gv, show_c).rename(columns={"_dist":"District","_state":"State"}),
                     use_container_width=True, hide_index=True, height=260)

    st.markdown("---")
    c1, c2 = st.columns(2)
    with c1:
        if "dataValue" in gv.columns and "stationName" in gv.columns:
            top  = gv.dropna(subset=["dataValue"]).nsmallest(15,"dataValue")
            clrs = ["#dc2626" if v < -15 else "#d97706" for v in top["dataValue"]]
            st.plotly_chart(make_hbar(top["stationName"].tolist(), top["dataValue"].tolist(),
                                      "15 Deepest GW Levels", clrs, "Level (m)"),
                            use_container_width=True, key="pc_gw_top")
    with c2:
        if "wellType" in gv.columns:
            wt = gv["wellType"].value_counts().head(6)
            st.plotly_chart(make_pie(wt.index.tolist(), wt.values.tolist(), "Well Type Distribution"),
                            use_container_width=True, key="pc_8")

    if "aquiferType" in gv.columns:
        c3, c4 = st.columns(2)
        with c3:
            at = gv["aquiferType"].value_counts().head(6)
            st.plotly_chart(make_pie(at.index.tolist(), at.values.tolist(), "Aquifer Type",
                                     ["#06b6d4","#3b82f6","#8b5cf6","#ec4899"]),
                            use_container_width=True, key="pc_gw_aq")
        with c4:
            if "_state" in df_gw.columns and "dataValue" in df_gw.columns:
                sa = df_gw.groupby("_state")["dataValue"].mean().round(2).sort_values().head(15)
                st.plotly_chart(make_hbar(sa.index.tolist(), sa.values.tolist(),
                                          "Avg GW Level by State", ["#3b82f6"]*len(sa), "Level (m)", 380),
                                use_container_width=True, key="pc_gw_sa")

# ═══════════════════════════════════════════════════════════════════════════════
# RAINFALL
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Rainfall":
    st.title("🌧️ Rainfall Monitoring")
    st.markdown('<div class="info-box"><h4>ℹ️ Rainfall Data</h4>'
                '<p>Telemetric readings in mm from IMD/CWC gauges. High rainfall increases runoff, '
                'worsening water quality — especially nitrate from agricultural fields and faecal coliform from open areas.</p></div>',
                unsafe_allow_html=True)
    if df_rain.empty: st.warning(f"No files in {RAINP}"); st.stop()

    r_states = ["All States"] + sorted(df_rain["_state"].dropna().unique().tolist())
    r_st = st.selectbox("Select State", r_states, key="r_st")
    rv   = df_rain[df_rain["_state"] == r_st].copy() if r_st != "All States" else df_rain.copy()

    rcol  = "stationName" if "stationName" in rv.columns else "_dist"
    rstns = ["All Stations"] + sorted(rv[rcol].dropna().unique().tolist())[:300]
    r_stn = st.selectbox("Select Station", rstns, key="r_stn")
    if r_stn != "All Stations": rv = rv[rv[rcol] == r_stn]
    st.caption(f"{len(rv):,} records")

    show_r = [c for c in ["stationCode","stationName","_dist","_state","dataValue","unit","stationStatus"] if c in rv.columns]
    with st.expander("📋 Data Table", expanded=False):
        st.dataframe(safe_df(rv, show_r).rename(columns={"_dist":"District","_state":"State"}),
                     use_container_width=True, hide_index=True, height=260)

    st.markdown("---")
    c1, c2 = st.columns(2)
    with c1:
        if "dataValue" in rv.columns and rcol in rv.columns:
            tr = rv.dropna(subset=["dataValue"]).nlargest(15,"dataValue")
            st.plotly_chart(make_hbar(tr[rcol].tolist(), tr["dataValue"].tolist(),
                                      "Top 15 by Rainfall", ["#3b82f6"]*15, "mm"),
                            use_container_width=True, key="pc_rain_top")
    with c2:
        if "_state" in rv.columns and "dataValue" in rv.columns:
            sr = rv.groupby("_state")["dataValue"].mean().round(2).sort_values(ascending=False).head(15)
            st.plotly_chart(make_hbar(sr.index.tolist(), sr.values.tolist(),
                                      "Avg Rainfall by State", ["#06b6d4"]*len(sr), "mm"),
                            use_container_width=True, key="pc_rain_state")

    if "_dist" in rv.columns and "dataValue" in rv.columns:
        dr = rv.groupby("_dist")["dataValue"].mean().round(2).sort_values(ascending=False).head(20)
        st.plotly_chart(make_hbar(dr.index.tolist(), dr.values.tolist(),
                                  "Avg Rainfall by District (Top 20)", ["#8b5cf6"]*len(dr), "mm", 500),
                        use_container_width=True, key="pc_rain_dist")

# ═══════════════════════════════════════════════════════════════════════════════
# ALERTS
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Alerts":
    st.title("🚨 Alerts & Advisories")
    st.markdown('<div class="info-box"><h4>ℹ️ How Alerts Are Generated</h4>'
                '<p>CRITICAL = immediate health risk. WARNING = concerning, needs monitoring. '
                'Thresholds from WHO and BIS IS:10500. '
                'Parameters monitored: BOD, Faecal Coliform, Dissolved Oxygen, and Nitrate (NO₃).</p></div>',
                unsafe_allow_html=True)

    all_al  = make_alerts(df_all) if not df_all.empty else []
    a_state = st.selectbox("Filter by State", ["All States"] + clean_states, key="al_state")
    # FIX: Added NO3 to the param filter so users can filter nitrate alerts specifically
    a_param = st.selectbox("Filter by Parameter", ["All Parameters","BOD","FC","DO","NO3"], key="al_param")
    a_srch  = st.text_input("🔍 Search station name", placeholder="e.g. River Ganga or Chennai…", key="al_srch")

    shown = all_al
    if a_state != "All States":     shown = [a for a in shown if a["state"] == a_state]
    if a_param != "All Parameters": shown = [a for a in shown if a["param"] == a_param]
    if a_srch.strip():              shown = [a for a in shown if a_srch.lower() in a["station"].lower()]

    st.caption(f"Showing {len(shown)} alerts")
    if not shown:
        st.success("✅ No alerts match your filter.")
    else:
        for a in shown:
            cls = f"alert-{a['type'].lower()}"
            ico = {"CRITICAL":"🔴","WARNING":"🟠"}.get(a["type"],"🔵")
            st.markdown(
                f'<div class="{cls}"><b>{ico} [{a["type"]}] {a["msg"]}</b><br>'
                f'<small style="color:#64748b">📍 {a["station"]} · 🗺️ {a["state"]} · ⚗️ {a["param"]} · 📅 {a["yr"]}</small></div>',
                unsafe_allow_html=True)

    st.markdown("---")
    st.subheader("📊 Alert Analytics")
    if all_al:
        adf = pd.DataFrame(all_al)
        c1, c2, c3 = st.columns(3)
        with c1:
            tc = adf["type"].value_counts()
            st.plotly_chart(make_pie(tc.index.tolist(), tc.values.tolist(), "By Severity",
                                     ["#dc2626","#d97706","#1e88e5"]),
                            use_container_width=True, key="pc_al_sev")
        with c2:
            # FIX: NO3 will now appear in this pie since alerts include nitrate
            pc = adf["param"].value_counts()
            st.plotly_chart(make_pie(pc.index.tolist(), pc.values.tolist(), "By Parameter",
                                     ["#1e88e5","#dc2626","#16a34a","#7c3aed"]),
                            use_container_width=True, key="pc_15")
        with c3:
            sc = adf.groupby("state").size().sort_values(ascending=False).head(10)
            st.plotly_chart(make_hbar(sc.index.tolist(), sc.values.tolist(),
                                      "Alerts per State (Top 10)",
                                      ["#dc2626" if i < 3 else "#d97706" for i in range(len(sc))],
                                      "Count", 380),
                            use_container_width=True, key="pc_al_st")

    st.markdown("---")
    st.subheader("📋 WHO / BIS IS:10500 Reference Thresholds")
    # FIX: Updated Nitrate row to clarify Blue Baby Syndrome and eutrophication significance
    tdf = pd.DataFrame([
        {"Parameter":"Dissolved Oxygen","Safe":">= 6 mg/L","Warning":"< 4 mg/L","Critical":"< 2 mg/L","Significance":"Aquatic life survival"},
        {"Parameter":"BOD","Safe":"<= 3 mg/L","Warning":"> 10 mg/L","Critical":"> 30 mg/L","Significance":"Organic/sewage pollution"},
        {"Parameter":"pH","Safe":"6.5–8.5","Warning":"<6 or >9","Critical":"<5 or >10","Significance":"Acidity/alkalinity balance"},
        {"Parameter":"Faecal Coliform","Safe":"<= 100 MPN/100mL","Warning":">500","Critical":">1000","Significance":"Sewage contamination, disease risk"},
        {"Parameter":"Nitrate (NO₃)","Safe":"<= 45 mg/L","Warning":">45 mg/L","Critical":">100 mg/L",
         "Significance":"Blue Baby Syndrome, eutrophication, algal blooms"},   # FIX: added significance
        {"Parameter":"Conductivity","Safe":"< 1500 μS/cm","Warning":"1500–3000","Critical":">3000","Significance":"Dissolved salts/industrial load"},
    ])
    for c in tdf.columns: tdf[c] = tdf[c].astype(str)
    st.dataframe(tdf, use_container_width=True, hide_index=True)

# ═══════════════════════════════════════════════════════════════════════════════
# NGO DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "NGO Dashboard":
    st.title("🏢 NGO & Authority Dashboard")
    st.markdown('<div class="info-box"><h4>ℹ️ For NGOs & Government Authorities</h4>'
                '<p>Comprehensive summary of critical water quality issues. Use sidebar filters to drill into states.</p></div>',
                unsafe_allow_html=True)
    if df.empty: st.warning("No data. Adjust sidebar filters."); st.stop()

    crit_st = df[df["wqi"] < 30]
    poor_st = df[(df["wqi"] >= 30) & (df["wqi"] < 50)]
    fair_st = df[(df["wqi"] >= 50) & (df["wqi"] < 70)]
    good_st = df[df["wqi"] >= 70]

    k1, k2, k3, k4 = st.columns(4)
    for col, (ic, v, lb, cl) in zip([k1,k2,k3,k4], [
        ("🔴", len(crit_st), "Critical Stations (WQI<30)", "#dc2626"),
        ("🟠", len(poor_st), "Poor Stations (WQI<50)",    "#d97706"),
        ("🟡", len(fair_st), "Fair Stations (WQI<70)",    "#ca8a04"),
        ("🟢", len(good_st), "Good/Excellent Stations",   "#16a34a")]):
        col.markdown(mcard(ic, str(v), lb, cl), unsafe_allow_html=True)

    st.markdown("---")
    st.subheader("📊 Parameter Comparison Across States")
    p_choices = {"DO (mg/L)":"do_max","BOD (mg/L)":"bod_max","pH":"ph_max",
                 "Faecal Coliform (MPN/100mL)":"fc_max","Nitrate (mg/L)":"no3_max","WQI Score":"wqi"}
    sel_param = st.selectbox("Select Parameter", list(p_choices.keys()), key="ngo_param")
    pcol = p_choices[sel_param]
    if "state" in df.columns and pcol in df.columns:
        sp   = df.groupby("state")[pcol].mean().round(2).sort_values(ascending=False)
        sp   = sp[sp.index.str.strip() != ""]
        clrs = [wlbl(v)[1] if sel_param == "WQI Score" else PAL[0] for v in sp.values]
        figP = go.Figure(go.Bar(x=sp.index.tolist(), y=sp.values.tolist(),
                                marker_color=clrs, text=[f"{v:.1f}" for v in sp.values],
                                textposition="outside",
                                hovertemplate="<b>%{x}</b><br>"+sel_param+": %{y:.2f}<extra></extra>"))
        # FIX: Add WHO reference line when nitrate is selected
        if sel_param == "Nitrate (mg/L)":
            figP.add_hline(y=45, line_dash="dash", line_color="#d97706",
                           annotation_text="WHO limit 45 mg/L")
            figP.add_hline(y=100, line_dash="dash", line_color="#dc2626",
                           annotation_text="Critical 100 mg/L")
        figP.update_layout(yaxis_title=sel_param)
        st.plotly_chart(_layout(figP, 400, 90), use_container_width=True, key="pc_17")

    st.markdown("---")
    st.subheader("💧 WQI by Water Body Type — State Breakdown")
    if "state" in df.columns and "_tlbl" in df.columns:
        pv = df.groupby(["state","_tlbl"])["wqi"].mean().round(1).unstack("_tlbl")
        pv = pv[pv.index.str.strip() != ""]
        if not pv.empty:
            figT = go.Figure()
            for i, cn in enumerate(pv.columns):
                figT.add_trace(go.Bar(name=cn, x=pv.index.tolist(), y=pv[cn].tolist(),
                                      marker_color=PAL[i%len(PAL)],
                                      hovertemplate="<b>%{x}</b><br>"+cn+": %{y:.1f}<extra></extra>"))
            figT.update_layout(barmode="group", yaxis_title="Avg WQI", yaxis_range=[0,120],
                               legend=dict(bgcolor=CBG, bordercolor=GRD))
            st.plotly_chart(_layout(figT, 420, 90), use_container_width=True, key="pc_18")

    st.markdown("---")
    col_l, col_r = st.columns(2)
    with col_l:
        st.subheader("🔴 Critical Stations (WQI < 30)")
        if not crit_st.empty:
            st.dataframe(safe_df(crit_st.sort_values("wqi"),
                                 ["loc","state","_tlbl","_year","wqi","bod_max","fc_max","no3_max"])
                         .rename(columns={"loc":"Station","state":"State","_tlbl":"Type","_year":"Year",
                                          "wqi":"WQI","bod_max":"BOD Max","fc_max":"FC Max",
                                          "no3_max":"NO3 Max"}),  # FIX: added NO3 column
                         use_container_width=True, hide_index=True, height=280)
        else: st.success("No critical stations in selection!")

    with col_r:
        st.subheader("⚠️ Stations Exceeding BOD Limit (>30 mg/L)")
        bod_exc = df[df["bod_max"] > 30].sort_values("bod_max", ascending=False).head(10)
        if not bod_exc.empty:
            st.dataframe(safe_df(bod_exc, ["loc","state","bod_max","fc_max","no3_max","wqi"])
                         .rename(columns={"loc":"Station","state":"State","bod_max":"BOD Max",
                                          "fc_max":"FC Max","no3_max":"NO3 Max","wqi":"WQI"}),  # FIX
                         use_container_width=True, hide_index=True, height=280)
        else: st.success("No BOD exceedance in selection!")

    # FIX: New section — stations where nitrate exceeds WHO limit
    st.markdown("---")
    st.subheader("🌿 Stations Exceeding Nitrate WHO Limit (>45 mg/L)")
    if "no3_max" in df.columns:
        no3_exc = df[df["no3_max"] > 45].sort_values("no3_max", ascending=False).head(10)
        if not no3_exc.empty:
            st.dataframe(safe_df(no3_exc, ["loc","state","_tlbl","no3_max","bod_max","wqi"])
                         .rename(columns={"loc":"Station","state":"State","_tlbl":"Type",
                                          "no3_max":"Nitrate Max (mg/L)","bod_max":"BOD Max","wqi":"WQI"}),
                         use_container_width=True, hide_index=True, height=250)
        else:
            st.success("✅ No stations exceed the nitrate WHO limit in current selection.")
    else:
        st.info("Nitrate data not available in current selection.")

    st.markdown("---")
    st.subheader("🗺️ State Water Quality Ranking")
    if "state" in df.columns:
        sw = df.groupby("state").agg(
            avg_wqi=("wqi","mean"), stations=("loc","count"),
            critical=("wqi", lambda x: (x < 30).sum()),
            poor=("wqi", lambda x: ((x >= 30) & (x < 50)).sum()),
            avg_bod=("bod_max","mean"),
            avg_fc=("fc_max","mean"),
            avg_no3=("no3_max","mean")    # FIX: added nitrate average
        ).round(1).sort_values("avg_wqi").reset_index()
        sw["Quality"] = sw["avg_wqi"].apply(lambda x: wlbl(x)[0])
        sw_s = sw.copy()
        for c in sw_s.columns: sw_s[c] = sw_s[c].astype(str)
        st.dataframe(sw_s.rename(columns={"state":"State","avg_wqi":"Avg WQI","stations":"Stations",
                                           "critical":"Critical","poor":"Poor","avg_bod":"Avg BOD",
                                           "avg_fc":"Avg FC","avg_no3":"Avg NO3","Quality":"Quality"}),
                     use_container_width=True, hide_index=True, height=300)

# ═══════════════════════════════════════════════════════════════════════════════
# TRENDS
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Trends":
    st.title("📈 Historical Trends — 2021 · 2022 · 2023")
    st.markdown('<div class="info-box"><h4>ℹ️ Reading Trends</h4>'
                '<p>Rising BOD/FC/NO3 = worsening pollution. Falling DO = oxygen depletion. '
                'Rising Nitrate = increasing agricultural runoff or sewage infiltration.</p></div>',
                unsafe_allow_html=True)
    if df_all.empty: st.warning("No NWMP data."); st.stop()

    popts = {"Dissolved Oxygen (DO)":"do_max","BOD":"bod_max","pH":"ph_max",
             "Faecal Coliform":"fc_max","Nitrate":"no3_max","WQI":"wqi"}
    c_p, c_s = st.columns(2)
    sel_p   = c_p.selectbox("Parameter", list(popts.keys()), key="tr_p")
    t_state = c_s.selectbox("Filter State", ["All States"] + clean_states, key="tr_st")
    pcol = popts[sel_p]
    dft  = df_all.copy()
    if t_state != "All States": dft = dft[dft["state"] == t_state]

    pkey_map = {"Dissolved Oxygen (DO)":"DO","BOD":"BOD","pH":"pH",
                "Faecal Coliform":"FC","Nitrate":"NO3","WQI":"WQI"}
    ibox(pkey_map[sel_p])

    tab1, tab2, tab3 = st.tabs(["📊 By Water Body Type","🗺️ By State","📍 By Station"])

    with tab1:
        if "_tlbl" in dft.columns and pcol in dft.columns:
            pv = dft.groupby(["_year","_tlbl"])[pcol].mean().unstack("_tlbl").round(2)
            if not pv.empty:
                st.plotly_chart(make_line(pv, f"{sel_p} — Trend by Water Body Type", sel_p),
                                use_container_width=True, key="pc_19")
                figYr = go.Figure()
                for i, yr in enumerate(pv.index.tolist()):
                    figYr.add_trace(go.Bar(name=yr, x=pv.columns.tolist(), y=pv.loc[yr].tolist(),
                                           marker_color=PAL[i%len(PAL)]))
                figYr.update_layout(barmode="group", yaxis_title=sel_p, legend=dict(bgcolor=CBG))
                st.plotly_chart(_layout(figYr, 360, 40, 50, 0), use_container_width=True, key="pc_20")

    with tab2:
        if "state" in dft.columns and pcol in dft.columns:
            top_st = dft["state"].value_counts().head(10).index.tolist()
            pv2 = dft[dft["state"].isin(top_st)].groupby(["_year","state"])[pcol].mean().unstack("state").round(2)
            if not pv2.empty:
                st.plotly_chart(make_line(pv2, f"{sel_p} — Trend by State (Top 10)", sel_p),
                                use_container_width=True, key="pc_21")
                if len(pv2) >= 2:
                    delta = (pv2.iloc[-1] - pv2.iloc[0]).round(2).reset_index()
                    delta.columns = ["State","Change 2021→2023"]
                    # FIX: Nitrate is a "lower is better" parameter like BOD/FC
                    delta["Direction"] = delta["Change 2021→2023"].apply(
                        lambda x: "⬆️ Worsened" if (x > 0 and sel_p not in ("Dissolved Oxygen (DO)","WQI"))
                                  else ("⬆️ Improved" if x > 0 else
                                        ("⬇️ Worsened" if sel_p in ("Dissolved Oxygen (DO)","WQI") else "⬇️ Improved")))
                    for c in delta.columns: delta[c] = delta[c].astype(str)
                    st.markdown("**Year-on-year change 2021 → 2023:**")
                    st.dataframe(delta, use_container_width=True, hide_index=True)

    with tab3:
        stn_t_state = st.selectbox("Filter State for Station List", ["All States"] + clean_states, key="tr_stn_st")
        dft_stn = dft.copy()
        if stn_t_state != "All States": dft_stn = dft[dft["state"] == stn_t_state]
        stns_t = sorted(dft_stn["loc"].dropna().unique().tolist())[:400] if not dft_stn.empty else []
        if not stns_t:
            st.info("No stations found.")
        else:
            sel_ts = st.selectbox("Select Station", stns_t, key="tr_stn")
            sd = dft[dft["loc"] == sel_ts].groupby("_year")[pcol].mean().round(2)
            if not sd.empty:
                figS = go.Figure(go.Scatter(
                    x=sd.index.tolist(), y=sd.values.tolist(),
                    mode="lines+markers+text", text=[str(v) for v in sd.values],
                    textposition="top center", line=dict(color="#1e88e5", width=3),
                    marker=dict(size=12, color="#1e88e5", line=dict(color="white", width=2)),
                    fill="tozeroy", fillcolor="rgba(30,136,229,0.08)"))
                # FIX: Add WHO reference line for nitrate trend chart
                if sel_p == "Nitrate":
                    figS.add_hline(y=45, line_dash="dash", line_color="#d97706",
                                   annotation_text="WHO limit 45 mg/L")
                    figS.add_hline(y=100, line_dash="dash", line_color="#dc2626",
                                   annotation_text="Critical 100 mg/L")
                figS.update_layout(title=f"{sel_p} at: {sel_ts[:60]}",
                    paper_bgcolor=CPP, plot_bgcolor=CBG, font_color=FC, height=300,
                    xaxis=dict(gridcolor=GRD, title="Year"), yaxis=dict(gridcolor=GRD, title=sel_p),
                    margin=dict(t=50, b=30, l=50, r=20))
                st.plotly_chart(figS, use_container_width=True, key="pc_22")

                st.markdown(f"**All Parameters — {sel_ts[:60]}:**")
                rows_t = []
                for yr in YEARS:
                    yrdf = dft[(dft["loc"] == sel_ts) & (dft["_year"] == yr)]
                    if not yrdf.empty:
                        row = {"Year": yr}
                        for pn, pc2 in [("DO Max","do_max"),("BOD Max","bod_max"),("pH Max","ph_max"),
                                        ("FC Max","fc_max"),("NO3 Max","no3_max"),("WQI","wqi")]:
                            try:
                                v = yrdf[pc2].mean() if pc2 in yrdf.columns else float("nan")
                                row[pn] = str(round(float(v),2)) if pd.notna(v) else "N/A"
                            except: row[pn] = "N/A"
                        rows_t.append(row)
                if rows_t:
                    tbl = pd.DataFrame(rows_t)
                    for c in tbl.columns: tbl[c] = tbl[c].astype(str)
                    st.dataframe(tbl, use_container_width=True, hide_index=True)
            else:
                st.info(f"No data for {sel_ts} with parameter {sel_p}.")

    st.markdown("---")
    exp = df_all.groupby(["_year","_tlbl","state"])[list(popts.values())].mean().round(2).reset_index()
    for c in exp.columns: exp[c] = exp[c].astype(str)
    st.download_button("⬇️ Download Trend CSV", exp.to_csv(index=False), "trends.csv", "text/csv")
from flask import Flask, jsonify
from flask_cors import CORS
import requests
import os
import json

app = Flask(__name__)
CORS(app)

START_DATE = "2024-01-01"
END_DATE = "2025-12-31"

# ---- FINAL API CONFIG ----
API_CONFIG = {
    "groundwater": {
        "endpoint": "Ground Water Level",
        "agency": "CGWB"
    },
    "rainfall": {
        "endpoint": "RainFall",
        "agency": "CWC"
    }
}

# ---- 29 STATES (3 districts each) ----
STATES_DATA = [
    {"state": "Andhra Pradesh", "districts": ["Visakhapatnam", "Guntur", "Krishna"]},
    {"state": "Telangana", "districts": ["Hyderabad", "Warangal", "Nizamabad"]},
    {"state": "Odisha", "districts": ["Baleshwar", "Cuttack", "Khordha"]},
    {"state": "Tamil Nadu", "districts": ["Chennai", "Coimbatore", "Madurai"]},
    {"state": "Maharashtra", "districts": ["Mumbai", "Pune", "Nagpur"]},
    {"state": "Karnataka", "districts": ["Bengaluru Urban", "Mysuru", "Hubli"]},
    {"state": "Uttar Pradesh", "districts": ["Lucknow", "Kanpur", "Varanasi"]},
    {"state": "West Bengal", "districts": ["Kolkata", "Howrah", "Darjeeling"]},
    {"state": "Rajasthan", "districts": ["Jaipur", "Jodhpur", "Udaipur"]},
    {"state": "Gujarat", "districts": ["Ahmedabad", "Surat", "Vadodara"]},
    {"state": "Punjab", "districts": ["Ludhiana", "Amritsar", "Jalandhar"]},
    {"state": "Haryana", "districts": ["Gurgaon", "Faridabad", "Panipat"]},
    {"state": "Bihar", "districts": ["Patna", "Gaya", "Muzaffarpur"]},
    {"state": "Kerala", "districts": ["Thiruvananthapuram", "Kochi", "Kozhikode"]},
    {"state": "Madhya Pradesh", "districts": ["Bhopal", "Indore", "Jabalpur"]},
    {"state": "Assam", "districts": ["Kamrup", "Dibrugarh", "Cachar"]},
    {"state": "Jharkhand", "districts": ["Ranchi", "Jamshedpur", "Dhanbad"]},
    {"state": "Chhattisgarh", "districts": ["Raipur", "Durg", "Bilaspur"]},
    {"state": "Himachal Pradesh", "districts": ["Shimla", "Kullu", "Kangra"]},
    {"state": "Uttarakhand", "districts": ["Dehradun", "Haridwar", "Nainital"]},
    {"state": "Goa", "districts": ["North Goa", "South Goa", "Panaji"]},
    {"state": "Manipur", "districts": ["Imphal West", "Imphal East", "Churachandpur"]},
    {"state": "Meghalaya", "districts": ["East Khasi Hills", "West Garo Hills", "Ri Bhoi"]},
    {"state": "Mizoram", "districts": ["Aizawl", "Lunglei", "Champhai"]},
    {"state": "Nagaland", "districts": ["Kohima", "Dimapur", "Mokokchung"]},
    {"state": "Sikkim", "districts": ["East Sikkim", "West Sikkim", "South Sikkim"]},
    {"state": "Tripura", "districts": ["West Tripura", "Sepahijala", "Dhalai"]},
    {"state": "Arunachal Pradesh", "districts": ["Tawang", "Papum Pare", "West Siang"]}
]


def fetch_api_data(api_key):

    if api_key not in API_CONFIG:
        return {"error": "Invalid API key"}

    endpoint = API_CONFIG[api_key]["endpoint"]
    agency = API_CONFIG[api_key]["agency"]

    base_url = f"https://indiawris.gov.in/Dataset/{endpoint}"

    folder = f"{api_key}_data"
    os.makedirs(folder, exist_ok=True)

    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://indiawris.gov.in/"
    }

    for state in STATES_DATA:

        state_result = {
            "state": state["state"],
            "districts": {}
        }

        for district in state["districts"]:

            params = {
                "stateName": state["state"],
                "districtName": district,
                "agencyName": agency,
                "startdate": START_DATE,
                "enddate": END_DATE,
                "download": "false",
                "page": 0,
                "size": 500
            }

            try:
                response = requests.post(
                    base_url,
                    params=params,
                    headers=headers,
                    timeout=25
                )

                print(state["state"], district, response.status_code)

                if response.status_code == 200:
                    try:
                        data_json = response.json()
                        state_result["districts"][district] = data_json
                    except:
                        state_result["districts"][district] = {"error": "Invalid JSON"}
                else:
                    state_result["districts"][district] = {
                        "error": f"HTTP {response.status_code}"
                    }

            except Exception as e:
                state_result["districts"][district] = {"error": str(e)}

        filename = state["state"].replace(" ", "_") + ".json"

        with open(os.path.join(folder, filename), "w") as f:
            json.dump(state_result, f, indent=4)

    return "Completed"


@app.route("/fetch/<api_key>")
def run_fetch(api_key):
    result = fetch_api_data(api_key)
    return jsonify({"status": result})


if __name__ == "__main__":
    app.run(port=8000, debug=True)

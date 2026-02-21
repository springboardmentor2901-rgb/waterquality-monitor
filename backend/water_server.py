import os
import pdfplumber
import json
import re
from tqdm import tqdm

BASE_FOLDER = "NWMP_Data"


def safe_float(value):
    try:
        return float(str(value).strip())
    except:
        return None


def clean_text(text):
    if not text:
        return None
    text = re.sub(r'\s+', ' ', str(text)).strip()
    return text


def classify_water(do_min, bod_max):
    if do_min is None or bod_max is None:
        return None

    if do_min >= 6 and bod_max <= 2:
        return "A"
    elif do_min >= 5 and bod_max <= 3:
        return "B"
    elif do_min >= 4 and bod_max <= 3:
        return "C"
    elif do_min >= 4 and bod_max > 3:
        return "D"
    else:
        return "E"


def detect_water_body(category, row):
    if category == "lakes":
        return "LAKE"
    if category == "creeks":
        return "MARINE"
    if category == "drains":
        return "DRAIN"
    if category == "medium":
        return "RIVER"
    return None


def build_record(year, category, row):
    station_code = clean_text(row[0])
    location = clean_text(row[1])
    state = clean_text(row[2])

    temp_min = safe_float(row[3])
    temp_max = safe_float(row[4])
    do_min = safe_float(row[5])
    do_max = safe_float(row[6])
    ph_min = safe_float(row[7])
    ph_max = safe_float(row[8])
    cond_min = safe_float(row[9])
    cond_max = safe_float(row[10])
    bod_min = safe_float(row[11])
    bod_max = safe_float(row[12])
    nitrate_min = safe_float(row[13])
    nitrate_max = safe_float(row[14])
    fc_min = safe_float(row[15])
    fc_max = safe_float(row[16])
    tc_min = safe_float(row[17])
    tc_max = safe_float(row[18])

    record = {
        "year": year,
        "category": category,
        "stationCode": station_code,
        "monitoringLocation": location,
        "state": state,
        "typeOfWaterBody": detect_water_body(category, row),
        "waterQualityClass": classify_water(do_min, bod_max),
        "parameters": {
            "temperature": {"min": temp_min, "max": temp_max},
            "dissolvedOxygen": {"min": do_min, "max": do_max},
            "pH": {"min": ph_min, "max": ph_max},
            "conductivity": {"min": cond_min, "max": cond_max},
            "BOD": {"min": bod_min, "max": bod_max},
            "nitrate": {"min": nitrate_min, "max": nitrate_max},
            "fecalColiform": {"min": fc_min, "max": fc_max},
            "totalColiform": {"min": tc_min, "max": tc_max}
        }
    }

    # Rivers have fecalStreptococci
    if category == "rivers" and len(row) > 20:
        fs_min = safe_float(row[19])
        fs_max = safe_float(row[20])
        record["parameters"]["fecalStreptococci"] = {
            "min": fs_min,
            "max": fs_max
        }

    return record


def process_pdf(file_path, year, category):
    records = []

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    if row and row[0] and str(row[0]).strip().isdigit():
                        try:
                            record = build_record(year, category, row)
                            records.append(record)
                        except:
                            pass

    return records


def main():
    for year_folder in os.listdir(BASE_FOLDER):
        year_path = os.path.join(BASE_FOLDER, year_folder)

        if not os.path.isdir(year_path):
            continue

        year = int(year_folder)

        for file in os.listdir(year_path):
            if file.endswith(".pdf"):
                category = file.split("_")[0].lower()
                file_path = os.path.join(year_path, file)

                print(f"Processing {file}...")

                records = process_pdf(file_path, year, category)

                output_file = file.replace(".pdf", ".json")
                output_path = os.path.join(year_path, output_file)

                with open(output_path, "w") as f:
                    json.dump(records, f, indent=4)

                print(f"✅ Saved: {output_path} ({len(records)} records)")


if __name__ == "__main__":
    main()
    
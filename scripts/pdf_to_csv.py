import pdfplumber
import csv
import re

pdf_path = "../inputs/AD_2_LFBD_DATA_SID_RWY23_RNAV_CODE_01.pdf"
csv_path = "AD_2_LFBD_DATA_SID_RWY23_RNAV_CODE_01.csv"

rows = []

with pdfplumber.open(pdf_path) as pdf:
    for page in pdf.pages:
        text = page.extract_text()

        lines = text.split("\n")

        # détecter le début du tableau
        start = False

        for line in lines:
            if any(word in line for word in ["IF", "TF", "CF", "DF"]):
                line = line.strip()

                # remplacer les multiples espaces
                parts = re.split(" ", line)
                #print(parts)
                rows.append(parts)

# écriture CSV
with open(csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerows(rows)

print("CSV généré :", csv_path)
# scripts/fetch_supabase.py
import os
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

def fetch_data():
    # Connect ke Supabase
    supabase = create_client(
        os.environ["NEXT_PUBLIC_SUPABASE_URL"],
        os.environ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"]
    )

    print("Fetching data dari Supabase...")

    # Ambil semua data dari tabel
    response = (
        supabase.table("sensor_logs_suhu")
        .select("*")
        .order("recorded_at", desc=False)
        .execute()
    )

    df = pd.DataFrame(response.data)

    os.makedirs("data/raw/snapshots", exist_ok=True)

    # ✅ File latest — selalu nama sama (ditrack DVC)
    df.to_csv("data/raw/sensor_logs_suhu.csv", index=False)

    # ✅ Snapshot — arsip per tanggal (referensi, tidak ditrack DVC)
    timestamp = datetime.now().strftime("%Y%m%d")
    df.to_csv(f"data/raw/snapshots/sensor_logs_suhu_{timestamp}.csv", index=False)

    print(f"Saved {len(df)} rows")

if __name__ == "__main__":
    fetch_data()
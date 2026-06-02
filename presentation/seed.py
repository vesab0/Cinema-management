#!/usr/bin/env python3
"""
Twin Peaks Cinema — Comprehensive Seed Script
Presentation: Monday, June 1 2026

Prerequisites (run on host):
    pip install pymysql requests

The MySQL container must be port-forwarded to 127.0.0.1:3306
(or edit DB_HOST below).  Run ONCE on a fresh / reset database.
"""

import base64, datetime, hashlib, hmac as _hmac_mod, random, secrets
import string, sys, uuid
from itertools import product

import pymysql
import requests

# ══════════════════════════════════════════════════════════════════════════════
#  CONFIG — edit if your local port-mapping differs
# ══════════════════════════════════════════════════════════════════════════════
DB_HOST = "127.0.0.1"
DB_PORT = 3306
DB_USER = "root"
DB_PASSWORD = "root1234"
DB_NAME = "marquee"

S3_ENDPOINT  = "https://s3.filebase.io"
S3_HOST      = "s3.filebase.io"
S3_BUCKET    = "twin-peaks"
S3_ACCESS    = "B51E96F1928F8A899F04"
S3_SECRET    = "OffweSMVXbuUDs0duoIF58YbmPLQoYSPfYMgkPb0"

TMDB_BASE    = "https://image.tmdb.org/t/p/w500"

CLEAN_FIRST  = True   # truncate all tables before seeding
PASSWORD     = "test1234"

# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def uid() -> str:
    return str(uuid.uuid4())

def hash_password(plain: str) -> str:
    """PBKDF2-SHA256, 100k iterations, 16-byte salt — format: b64(salt).b64(hash)"""
    salt = secrets.token_bytes(16)
    key  = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt, 100_000)
    return base64.b64encode(salt).decode() + "." + base64.b64encode(key).decode()

def s3_put(data: bytes, filename: str, content_type: str = "image/jpeg") -> str:
    """Manual AWS Sig-V4 PUT — mirrors S3Service.cs (Filebase rejects chunked encoding)."""
    now = datetime.datetime.utcnow()
    ds  = now.strftime("%Y%m%d")
    ad  = now.strftime("%Y%m%dT%H%M%SZ")
    ph  = hashlib.sha256(data).hexdigest()
    path = f"/{S3_BUCKET}/{filename}"

    sh  = "content-type;host;x-amz-content-sha256;x-amz-date"
    ch  = (f"content-type:{content_type}\nhost:{S3_HOST}\n"
           f"x-amz-content-sha256:{ph}\nx-amz-date:{ad}\n")
    cr  = f"PUT\n{path}\n\n{ch}\n{sh}\n{ph}"
    cs  = f"{ds}/us-east-1/s3/aws4_request"
    ss  = f"AWS4-HMAC-SHA256\n{ad}\n{cs}\n{hashlib.sha256(cr.encode()).hexdigest()}"

    def H(k, d):
        return _hmac_mod.new(
            k if isinstance(k, bytes) else k.encode(),
            d.encode() if isinstance(d, str) else d,
            hashlib.sha256
        ).digest()

    sig_key = H(H(H(H(f"AWS4{S3_SECRET}", ds), "us-east-1"), "s3"), "aws4_request")
    sig     = _hmac_mod.new(sig_key, ss.encode(), hashlib.sha256).hexdigest()
    auth    = (f"AWS4-HMAC-SHA256 Credential={S3_ACCESS}/{cs}, "
               f"SignedHeaders={sh}, Signature={sig}")

    resp = requests.put(
        f"{S3_ENDPOINT}{path}",
        data=data,
        headers={
            "Authorization": auth,
            "x-amz-date": ad,
            "x-amz-content-sha256": ph,
            "Content-Type": content_type,
        },
        timeout=60,
    )
    if not resp.ok:
        raise RuntimeError(f"Filebase PUT failed {resp.status_code}: {resp.text[:300]}")
    return f"/api/images/{filename}"


def fetch_and_upload_poster(tmdb_path: str, s3_name: str) -> str:
    url = f"{TMDB_BASE}{tmdb_path}"
    print(f"    ↓ downloading {url}")
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    result = s3_put(r.content, s3_name)
    print(f"    ✓ uploaded  → {result}")
    return result


def conf_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=12))


def date_range(start: datetime.date, end: datetime.date):
    d = start
    while d <= end:
        yield d
        d += datetime.timedelta(days=1)


# ══════════════════════════════════════════════════════════════════════════════
#  DATA DEFINITIONS
# ══════════════════════════════════════════════════════════════════════════════

GENRES = [
    "Action", "Adventure", "Animation", "Comedy", "Crime",
    "Drama", "Fantasy", "Horror", "Science Fiction",
    "Thriller", "Family", "Sport",
]

# ── Movies ───────────────────────────────────────────────────────────────────
# Currently playing  = release_date < 2026-06-01
# Upcoming           = release_date >= 2026-06-01
MOVIES = [
    # ── Currently playing ─────────────────────────────────────────────────
    dict(
        key="mi_reckoning",
        name="Mission: Impossible – The Final Reckoning",
        description=(
            "Ethan Hunt and the IMF team continue their desperate hunt for the "
            "terrifying rogue AI known as the Entity, which has infiltrated "
            "intelligence networks across the globe. With world governments and "
            "a mysterious ghost from Hunt's past in pursuit, the mission becomes "
            "the most personal and dangerous of his career — a concluding chapter "
            "that raises the stakes beyond anything the team has faced before."
        ),
        duration=170,
        release_date=datetime.date(2026, 5, 22),
        director="Christopher McQuarrie",
        age_rating="PG-13",
        tmdb_id=575265,
        poster_path="/z53D72EAOxGRqdr7KXXWp9dJiDe.jpg",
        trailer_url="https://www.youtube.com/watch?v=fsQgc9pCyDU",
        genres=["Action", "Thriller", "Adventure"],
        cast=["Tom Cruise", "Hayley Atwell", "Ving Rhames", "Simon Pegg", "Henry Czerny"],
    ),
    dict(
        key="thunderbolts",
        name="Thunderbolts*",
        description=(
            "Seven disillusioned and morally compromised outcasts — each a former "
            "operative or enhanced individual — are ensnared in a death trap and "
            "forced to band together. Embarking on a dangerous mission, they must "
            "confront the darkest corners of their pasts and decide what kind of "
            "heroes, if any, they want to be."
        ),
        duration=127,
        release_date=datetime.date(2026, 5, 2),
        director="Jake Schreier",
        age_rating="PG-13",
        tmdb_id=986056,
        poster_path="/hqcexYHbiTBfDIdDWxrxPtVndBX.jpg",
        trailer_url="https://www.youtube.com/watch?v=v-94Snw-H4o",
        genres=["Action", "Adventure", "Science Fiction"],
        cast=["Florence Pugh", "Sebastian Stan", "David Harbour", "Wyatt Russell", "Julia Louis-Dreyfus"],
    ),
    dict(
        key="minecraft",
        name="A Minecraft Movie",
        description=(
            "Four ordinary misfits are suddenly pulled through a mysterious portal "
            "into the Overworld — a bizarre cubic wonderland that thrives on "
            "creativity and imagination. To find their way home, they must master "
            "the world of Minecraft and its many dangers, guided by Steve, a "
            "seasoned veteran voiced by Jack Black."
        ),
        duration=101,
        release_date=datetime.date(2026, 4, 4),
        director="Jared Hess",
        age_rating="PG",
        tmdb_id=950387,
        poster_path="/yFHHfHcUgGAxziP1C3lLt0q2T4s.jpg",
        trailer_url="https://www.youtube.com/watch?v=wJO_vIDZn-I",
        genres=["Animation", "Comedy", "Adventure", "Family"],
        cast=["Jason Momoa", "Jack Black", "Emma Myers", "Danielle Brooks"],
    ),
    dict(
        key="sinners",
        name="Sinners",
        description=(
            "Twin brothers return to their Mississippi Delta hometown trying to "
            "leave their troubled pasts behind and start fresh. Their plans are "
            "upended when they discover that an even greater evil has been waiting "
            "to welcome them back. Ryan Coogler blends Southern Gothic horror "
            "with music and mythology in this electrifying genre film."
        ),
        duration=138,
        release_date=datetime.date(2026, 4, 18),
        director="Ryan Coogler",
        age_rating="R",
        tmdb_id=1233413,
        poster_path="/q6ghYZEHqItvzsxhlp9GykM7fOH.jpg",
        trailer_url="https://www.youtube.com/watch?v=bKGxHflevuk",
        genres=["Horror", "Drama", "Thriller"],
        cast=["Michael B. Jordan", "Hailee Steinfeld", "Jack O'Connell", "Wunmi Mosaku"],
    ),
    dict(
        key="accountant2",
        name="The Accountant 2",
        description=(
            "When an old acquaintance is murdered, forensic accountant and "
            "high-functioning autistic assassin Christian Wolff is compelled to "
            "solve the case. Realizing more extreme measures are necessary, he "
            "recruits his estranged and highly lethal brother Brax to help on a "
            "mission more personal and dangerous than before."
        ),
        duration=133,
        release_date=datetime.date(2026, 4, 25),
        director="Gavin O'Connor",
        age_rating="R",
        tmdb_id=870028,
        poster_path="/lUvfTcOZiK0sdcX0WNLPbMyKjGm.jpg",
        trailer_url="https://www.youtube.com/watch?v=3wRCOqyDI6E",
        genres=["Action", "Thriller", "Crime"],
        cast=["Ben Affleck", "Jon Bernthal", "J.K. Simmons", "Daniella Pineda"],
    ),
    # ── Upcoming ──────────────────────────────────────────────────────────
    dict(
        key="httyd",
        name="How to Train Your Dragon",
        description=(
            "On the rugged Viking isle of Berk, young misfit Hiccup defies "
            "centuries of tradition when he befriends Toothless, a rare and "
            "feared Night Fury dragon. Their unlikely bond challenges everything "
            "both species believe about each other. A breathtaking live-action "
            "reimagining of the beloved animated classic."
        ),
        duration=125,
        release_date=datetime.date(2026, 6, 13),
        director="Dean DeBlois",
        age_rating="PG",
        tmdb_id=1087192,
        poster_path="/q5pXRYTycaeW6dEgsCrd4mYPmxM.jpg",
        trailer_url="https://www.youtube.com/watch?v=22w7z_lT6YM",
        genres=["Adventure", "Fantasy", "Family"],
        cast=["Mason Thames", "Nico Parker", "Gerard Butler", "Nick Frost"],
    ),
    dict(
        key="28yl",
        name="28 Years Later",
        description=(
            "Twenty-eight years after the devastating Rage virus outbreak, a "
            "heavily fortified island community survives. When one of the group "
            "ventures into the dark heart of the infected mainland, he discovers "
            "the world has mutated in terrifying ways — the infected, and the "
            "survivors, are nothing like what was expected. Danny Boyle returns."
        ),
        duration=115,
        release_date=datetime.date(2026, 6, 20),
        director="Danny Boyle",
        age_rating="R",
        tmdb_id=1100988,
        poster_path="/n5FygjEppOvac6yEaowi26nTyw3.jpg",
        trailer_url="https://www.youtube.com/watch?v=mcvLKldPM08",
        genres=["Horror", "Thriller", "Drama"],
        cast=["Aaron Taylor-Johnson", "Ralph Fiennes", "Jodie Comer", "Cillian Murphy"],
    ),
    dict(
        key="f1",
        name="F1",
        description=(
            "Racing legend Sonny Hayes is coaxed out of retirement to join a "
            "struggling Formula 1 team, where he must also mentor a talented but "
            "hot-headed young driver while chasing one last shot at glory. "
            "Directed by Joseph Kosinski with full F1 cooperation, featuring "
            "real race footage shot during actual Grand Prix weekends."
        ),
        duration=156,
        release_date=datetime.date(2026, 6, 25),
        director="Joseph Kosinski",
        age_rating="PG-13",
        tmdb_id=911430,
        poster_path="/vqBmyAj0Xm9LnS1xe1MSlMAJyHq.jpg",
        trailer_url="https://www.youtube.com/watch?v=8yh9BPUBbbQ",
        genres=["Action", "Drama", "Sport"],
        cast=["Brad Pitt", "Damson Idris", "Kerry Condon", "Tobias Menzies"],
    ),
    dict(
        key="jwrebirth",
        name="Jurassic World Rebirth",
        description=(
            "Five years after Dominion, covert operations expert Zora Bennett "
            "leads a skilled team on a top-secret mission to secure rare genetic "
            "material from the world's three most massive surviving dinosaurs. "
            "When the mission goes sideways, they must survive encounters with "
            "creatures more dangerous than anything previously seen."
        ),
        duration=134,
        release_date=datetime.date(2026, 7, 2),
        director="Gareth Edwards",
        age_rating="PG-13",
        tmdb_id=1234821,
        poster_path="/1RICxzeoNCAO5NpcRMIgg1XT6fm.jpg",
        trailer_url="https://www.youtube.com/watch?v=jan5CFWs9ic",
        genres=["Action", "Science Fiction", "Adventure"],
        cast=["Scarlett Johansson", "Jonathan Bailey", "Mahershala Ali", "Rupert Friend"],
    ),
    dict(
        key="superman",
        name="Superman",
        description=(
            "Clark Kent embarks on a journey to reconcile his Kryptonian heritage "
            "with his human upbringing as a journalist in Metropolis — while "
            "becoming the world's greatest hero. Written and directed by James "
            "Gunn, this is the first film in the rebooted DC Universe, "
            "introducing a Superman who balances hope with extraordinary power."
        ),
        duration=130,
        release_date=datetime.date(2026, 7, 11),
        director="James Gunn",
        age_rating="PG-13",
        tmdb_id=1061474,
        poster_path="/ldyfo0BKmz5rWtJJKCvwaNS4cJT.jpg",
        trailer_url="https://www.youtube.com/watch?v=Ox8ZLF6cGM0",
        genres=["Action", "Science Fiction", "Adventure"],
        cast=["David Corenswet", "Rachel Brosnahan", "Nicholas Hoult", "Edi Gathegi"],
    ),
]

# ── Rooms ─────────────────────────────────────────────────────────────────────
# SeatType stored as int: 0=Standard 1=VIP 2=Wheelchair
ROOMS = [
    dict(key="grand_hall",  name="Grand Hall",     rows=10, cols=15),
    dict(key="silver",      name="Silver Screen",  rows=8,  cols=12),
    dict(key="vip",         name="VIP Lounge",     rows=5,  cols=8),
    dict(key="imax",        name="IMAX Theater",   rows=12, cols=16),
    dict(key="family",      name="Family Room",    rows=8,  cols=10),
]

def seat_type(room_key: str, row_idx: int, col_num: int, total_rows: int) -> int:
    """0=Standard 1=VIP 2=Wheelchair"""
    if room_key == "vip":
        if row_idx == 0 and col_num == 1:
            return 2   # single wheelchair spot
        return 1
    if room_key == "imax":
        if row_idx < 2 and col_num in (1, 16):
            return 2
        if row_idx >= total_rows - 3:
            return 1
        return 0
    # grand_hall, silver, family
    if row_idx < 2 and col_num == 1:
        return 2
    if row_idx >= total_rows - 2:
        return 1
    return 0

# ── Schedule plan ─────────────────────────────────────────────────────────────
# Each entry: (room_key, [showtimes as HH:MM:SS])
# Unique constraint: (MovieId, RoomId, ScheduleDay, StartTime)
SCHEDULE_PLAN = {
    # ── Currently playing ─────────────────────────────────────────────────────
    # grand_hall during 5/25–6/12: mi_reckoning(170) + thunderbolts(127) + accountant2(133)
    #   10:00–12:50 | 13:30–15:37 | 16:00–18:13 | 18:30–21:20  → no overlap
    "mi_reckoning": [
        ("grand_hall", ["10:00:00", "18:30:00"]),
        ("imax",       ["17:00:00"]),          # alone in imax (5/25–6/12), no conflict
    ],
    "thunderbolts": [
        ("grand_hall", ["13:30:00"]),
        ("silver",     ["12:00:00"]),
    ],
    # silver during 5/25–6/7: minecraft(101) + thunderbolts(127) + accountant2(133) + sinners(138)
    #   10:00–11:41 | 12:00–14:07 | 14:30–16:43 | 17:15–19:33  → no overlap
    "minecraft": [
        ("family",     ["10:00:00", "14:30:00"]),   # family: 10:00–11:41 | 14:30–16:11
        ("silver",     ["10:00:00"]),
    ],
    "sinners": [
        ("silver",     ["17:15:00"]),
        ("vip",        ["19:30:00"]),               # vip: no date overlap with 28yl
    ],
    "accountant2": [
        ("silver",     ["14:30:00"]),
        ("grand_hall", ["16:00:00"]),
    ],
    # ── Upcoming ──────────────────────────────────────────────────────────────
    # family during 6/13–6/14: minecraft(101) + httyd(125)
    #   10:00–11:41 | 12:00–14:05 | 14:30–16:11 | 16:30–18:35  → no overlap
    # silver during 6/13–6/14: minecraft(101) + httyd(125)
    #   10:00–11:41 | 12:00–14:05  → no overlap
    # silver during 6/20–6/26: httyd(125) + 28yl(115)
    #   12:00–14:05 | 14:30–16:25 | 17:00–19:05 | 19:30–21:25  → no overlap
    "httyd": [
        ("family",     ["12:00:00", "16:30:00"]),
        ("silver",     ["12:00:00", "17:00:00"]),
    ],
    "28yl": [
        ("silver",     ["14:30:00", "19:30:00"]),
        ("vip",        ["20:00:00"]),
    ],
    # grand_hall during 7/2–7/8: jwrebirth(134) + f1(156)
    #   10:00–12:14 | 13:00–15:36 | 16:00–18:14 | 19:00–21:36  → no overlap
    # imax during 7/2–7/8: f1(156) + jwrebirth(134)
    #   10:00–12:36 | 13:00–15:14 | 15:45–18:21 | 19:00–21:14  → no overlap
    "f1": [
        ("grand_hall", ["13:00:00", "19:00:00"]),
        ("imax",       ["10:00:00", "15:45:00"]),
    ],
    # grand_hall during 7/11–7/15: jwrebirth(134) + superman(130)
    #   10:00–12:14 | 12:45–14:55 | 16:00–18:14 | 19:00–21:10  → no overlap
    # imax during 7/11–7/15: superman(130) + jwrebirth(134)
    #   10:00–12:10 | 13:00–15:14 | 15:45–17:55 | 19:00–21:14  → no overlap
    "jwrebirth": [
        ("grand_hall", ["10:00:00", "16:00:00"]),
        ("imax",       ["13:00:00", "19:00:00"]),
    ],
    "superman": [
        ("grand_hall", ["12:45:00", "19:00:00"]),
        ("imax",       ["10:00:00", "15:45:00"]),
    ],
}

# Schedule date windows
SCHED_WINDOW = {
    # currently playing: 10 days before → 12 days after presentation
    "mi_reckoning": (datetime.date(2026, 5, 25), datetime.date(2026, 6, 12)),
    "thunderbolts":  (datetime.date(2026, 5, 25), datetime.date(2026, 6, 10)),
    "minecraft":     (datetime.date(2026, 5, 25), datetime.date(2026, 6, 14)),
    "sinners":       (datetime.date(2026, 5, 25), datetime.date(2026, 6,  8)),
    "accountant2":   (datetime.date(2026, 5, 25), datetime.date(2026, 6,  7)),
    # upcoming: release date → release + 14 days
    "httyd":         (datetime.date(2026, 6, 13), datetime.date(2026, 6, 26)),
    "28yl":          (datetime.date(2026, 6, 20), datetime.date(2026, 7,  3)),
    "f1":            (datetime.date(2026, 6, 25), datetime.date(2026, 7,  8)),
    "jwrebirth":     (datetime.date(2026, 7,  2), datetime.date(2026, 7, 15)),
    "superman":      (datetime.date(2026, 7, 11), datetime.date(2026, 7, 24)),
}

# ── Users ─────────────────────────────────────────────────────────────────────
USERS = [
    dict(email="admin@twinpeak.com",       first="Admin",   last="TwinPeaks", role="admin"),
    dict(email="staff@twinpeaks.com",      first="Staff",   last="TwinPeaks", role="staff"),
    dict(email="vesa.basha1@gmail.com",    first="Vesa",    last="Basha",     role="user"),
    dict(email="bleditsm@gmail.com",       first="Bledit",  last="SM",        role="user"),
    dict(email="lowfione2@gmail.com",      first="Lowfi",   last="One",       role="user"),
]

# ── Favorites (TMDB) — clearly distinct taste per user ───────────────────────
# vesa: action blockbusters | bledit: epic fantasy | lowfi: kids/animation
USER_FAVORITES = {
    # vesa: action/superhero blockbusters — all in Kaggle dataset
    "vesa.basha1@gmail.com": [
        dict(tmdb_id=27205,  title="Inception",                    poster="/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg"),
        dict(tmdb_id=155,    title="The Dark Knight",               poster="/qJ2tW6WMUDux911r6m7haRef0WH.jpg"),
        dict(tmdb_id=24428,  title="The Avengers",                  poster="/RYMX2wcKCBAr24UyPD7KE3wYQly.jpg"),
        dict(tmdb_id=293660, title="Deadpool",                      poster="/fSRb7vyIP8rQpL0I47P3qUsEKX3.jpg"),
    ],
    # bledit: epic fantasy — LOTR + HP, all in dataset ✓
    "bleditsm@gmail.com": [
        dict(tmdb_id=120, title="The Lord of the Rings: The Fellowship of the Ring", poster="/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg"),
        dict(tmdb_id=121, title="The Lord of the Rings: The Two Towers",             poster="/5VTN0pR8gcqV3EPUHHfMGnJYspN.jpg"),
        dict(tmdb_id=122, title="The Lord of the Rings: The Return of the King",     poster="/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg"),
        dict(tmdb_id=671, title="Harry Potter and the Philosopher's Stone",          poster="/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg"),
    ],
    # lowfi: kids/animation — all in dataset ✓
    "lowfione2@gmail.com": [
        dict(tmdb_id=14160,  title="Up",                            poster="/lT2Y0WYd7WL3BbQRDEfKCNqw2Dc.jpg"),
        dict(tmdb_id=150540, title="Inside Out",                    poster="/aAmfIX3T8p7E4RBGjFg9lYUpWyV.jpg"),
        dict(tmdb_id=10681,  title="WALL·E",                        poster="/hbhFnRzzg6ZDmm8YAmxBnQpQIPh.jpg"),
        dict(tmdb_id=12,     title="Finding Nemo",                  poster="/eHuGQ10FUzK1mdOY69wF5pGgEf5.jpg"),
    ],
}

# ══════════════════════════════════════════════════════════════════════════════
#  MAIN SEED
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print("═" * 60)
    print("  Twin Peaks Cinema — Seed Script")
    print("═" * 60)

    conn = pymysql.connect(
        host=DB_HOST, port=DB_PORT,
        user=DB_USER, password=DB_PASSWORD,
        database=DB_NAME, charset="utf8mb4",
        autocommit=False,
    )
    cur = conn.cursor()

    # ── 0. Clean ────────────────────────────────────────────────────────────
    if CLEAN_FIRST:
        print("\n[0/8] Cleaning existing data…")
        cur.execute("SET FOREIGN_KEY_CHECKS = 0")
        for tbl in [
            "UserTickets", "Tickets", "UserFavoriteMovies",
            "MovieSchedules", "MovieGenres", "MovieCasts",
            "Movies", "Genres", "CastMembers",
            "Seats", "Rooms",
            "RefreshTokens",
            "UserRoles", "Users", "Roles",
        ]:
            cur.execute(f"TRUNCATE TABLE `{tbl}`")
        cur.execute("SET FOREIGN_KEY_CHECKS = 1")
        conn.commit()
        print("   ✓ All tables cleared")

    # ── 1. Roles ─────────────────────────────────────────────────────────────
    print("\n[1/8] Creating roles…")
    role_ids: dict[str, str] = {}
    for name, desc in [
        ("admin", "Full administrative access"),
        ("staff", "Box-office and scheduling staff"),
        ("user",  "Regular cinema-goer"),
    ]:
        rid = uid()
        role_ids[name] = rid
        cur.execute(
            "INSERT INTO Roles (Id, Name, Description) VALUES (%s, %s, %s)",
            (rid, name, desc),
        )
    conn.commit()
    print(f"   ✓ {len(role_ids)} roles")

    # ── 2. Users ─────────────────────────────────────────────────────────────
    print("\n[2/8] Creating users…")
    user_ids: dict[str, str] = {}
    now_dt = datetime.datetime.utcnow()
    for u in USERS:
        uid_ = uid()
        user_ids[u["email"]] = uid_
        cur.execute(
            """INSERT INTO Users
               (Id, FirstName, LastName, Email, PasswordHash,
                EmailConfirmed, LockoutEnabled, AccessFailedCount,
                CreatedAt, IsActive)
               VALUES (%s, %s, %s, %s, %s, 1, 0, 0, %s, 1)""",
            (uid_, u["first"], u["last"], u["email"],
             hash_password(PASSWORD), now_dt),
        )
        cur.execute(
            """INSERT INTO UserRoles (Id, UserId, RoleId, AssignedAt)
               VALUES (%s, %s, %s, %s)""",
            (uid(), uid_, role_ids[u["role"]], now_dt),
        )
    conn.commit()
    print(f"   ✓ {len(USERS)} users")

    # ── 3. Genres & Cast ────────────────────────────────────────────────────
    print("\n[3/8] Inserting genres and cast members…")
    genre_ids: dict[str, str] = {}
    for g in GENRES:
        gid = uid()
        genre_ids[g] = gid
        cur.execute("INSERT INTO Genres (Id, Name) VALUES (%s, %s)", (gid, g))

    cast_ids: dict[str, str] = {}
    all_cast = {name for m in MOVIES for name in m["cast"]}
    for name in sorted(all_cast):
        cid = uid()
        cast_ids[name] = cid
        cur.execute("INSERT INTO CastMembers (Id, FullName) VALUES (%s, %s)", (cid, name))

    conn.commit()
    print(f"   ✓ {len(genre_ids)} genres, {len(cast_ids)} cast members")

    # ── 4. Movies (with S3 poster upload) ───────────────────────────────────
    print("\n[4/8] Uploading posters and inserting movies…")
    movie_ids: dict[str, str] = {}
    for m in MOVIES:
        print(f"  → {m['name']}")
        fname = f"poster_{m['key']}.jpg"
        try:
            poster_url = fetch_and_upload_poster(m["poster_path"], fname)
        except Exception as e:
            print(f"    ⚠ poster upload failed ({e}), using TMDB URL as fallback")
            poster_url = f"{TMDB_BASE}{m['poster_path']}"

        mid = uid()
        movie_ids[m["key"]] = mid
        cur.execute(
            """INSERT INTO Movies
               (Id, Name, Description, DurationMinutes, ReleaseDate,
                Director, AgeRating, PosterUrl, TrailerUrl,
                IsActive, CreatedAt, TmdbId)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 1, %s, %s)""",
            (mid, m["name"], m["description"], m["duration"],
             m["release_date"], m["director"], m["age_rating"],
             poster_url, m["trailer_url"], now_dt, m["tmdb_id"]),
        )
        for g in m["genres"]:
            cur.execute(
                "INSERT INTO MovieGenres (MovieId, GenreId) VALUES (%s, %s)",
                (mid, genre_ids[g]),
            )
        for person in m["cast"]:
            cur.execute(
                "INSERT INTO MovieCasts (MovieId, CastMemberId) VALUES (%s, %s)",
                (mid, cast_ids[person]),
            )
    conn.commit()
    print(f"   ✓ {len(movie_ids)} movies")

    # ── 5. Rooms & Seats ────────────────────────────────────────────────────
    print("\n[5/8] Creating rooms and seats…")
    room_ids: dict[str, str] = {}
    # room_key → list of (seat_id, seat_type_int)
    room_seats: dict[str, list[tuple[str, int]]] = {}

    for rm in ROOMS:
        rid = uid()
        room_ids[rm["key"]] = rid
        cur.execute(
            """INSERT INTO Rooms (Id, Name, `Rows`, `Cols`, IsActive, CreatedAt)
               VALUES (%s, %s, %s, %s, 1, %s)""",
            (rid, rm["name"], rm["rows"], rm["cols"], now_dt),
        )
        seats = []
        seat_rows: list[tuple] = []
        for r_idx in range(rm["rows"]):
            row_label = chr(ord("A") + r_idx)
            for col in range(1, rm["cols"] + 1):
                stype = seat_type(rm["key"], r_idx, col, rm["rows"])
                sid = uid()
                seats.append((sid, stype))
                seat_rows.append((sid, rid, row_label, col, stype))

        cur.executemany(
            """INSERT INTO Seats
               (Id, RoomId, RowLabel, ColNumber, SeatType, IsActive)
               VALUES (%s, %s, %s, %s, %s, 1)""",
            seat_rows,
        )
        room_seats[rm["key"]] = seats

    conn.commit()
    total_seats = sum(len(v) for v in room_seats.values())
    print(f"   ✓ {len(room_ids)} rooms, {total_seats} seats")

    # ── 6. Schedules ────────────────────────────────────────────────────────
    print("\n[6/8] Generating schedules…")
    schedule_rows: list[tuple] = []
    # (sched_id, movie_key, room_key, day) — built in insertion order for ticket gen
    schedule_meta_full: list[tuple[str, str, str, datetime.date]] = []
    today = datetime.date(2026, 6, 1)

    for m in MOVIES:
        mkey = m["key"]
        mid  = movie_ids[mkey]
        start, end = SCHED_WINDOW[mkey]
        for day in date_range(start, end):
            for room_key, showtimes in SCHEDULE_PLAN[mkey]:
                for showtime in showtimes:
                    sid = uid()
                    schedule_rows.append((
                        sid, mid, room_ids[room_key],
                        day, showtime, now_dt, 1,
                    ))
                    schedule_meta_full.append((sid, mkey, room_key, day))

    cur.executemany(
        """INSERT INTO MovieSchedules
           (Id, MovieId, RoomId, ScheduleDay, StartTime, CreatedAt, IsActive)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        schedule_rows,
    )
    conn.commit()
    print(f"   ✓ {len(schedule_rows)} schedules")

    # ── 7. Tickets ──────────────────────────────────────────────────────────
    print("\n[7/8] Generating tickets…")
    STANDARD_PRICE   = "12.00"
    VIP_PRICE        = "18.00"
    WHEELCHAIR_PRICE = "12.00"

    ticket_batch: list[tuple] = []
    BATCH_SIZE = 2000

    total_tickets = 0

    def flush_batch():
        nonlocal total_tickets
        if ticket_batch:
            cur.executemany(
                """INSERT INTO Tickets
                   (Id, ScheduleId, SeatId, Price, Status, CreatedAt)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                ticket_batch,
            )
            total_tickets += len(ticket_batch)
            ticket_batch.clear()

    # Decide which movie each user "would attend" (for UserTicket seeding)
    # vesa → action: mi_reckoning, thunderbolts, accountant2
    # bledit → fantasy: sinners, thunderbolts
    # lowfi → family: minecraft, httyd
    user_preferred_movies = {
        "vesa.basha1@gmail.com":  {"mi_reckoning", "thunderbolts", "accountant2"},
        "bleditsm@gmail.com":     {"sinners", "thunderbolts"},
        "lowfione2@gmail.com":    {"minecraft"},
    }

    for sched_id, mkey, room_key, day in schedule_meta_full:
        seats = room_seats[room_key]
        is_past = day < today
        sell_frac = 0.45 if is_past else 0.0  # sell 45% of past shows

        sell_count = int(len(seats) * sell_frac)
        sold_indices = set(random.sample(range(len(seats)), sell_count))

        for i, (seat_id, stype) in enumerate(seats):
            if stype == 0:
                price = STANDARD_PRICE
            elif stype == 1:
                price = VIP_PRICE
            else:
                price = WHEELCHAIR_PRICE

            status = "Sold" if i in sold_indices else "Available"
            tid = uid()
            ticket_batch.append((tid, sched_id, seat_id, price, status, now_dt))

            if len(ticket_batch) >= BATCH_SIZE:
                flush_batch()
                conn.commit()

    flush_batch()
    conn.commit()
    print(f"   ✓ {total_tickets:,} tickets generated")

    # ── 7b. UserTickets (purchased tickets for regular users) ───────────────
    print("   → Creating purchase history…")
    user_ticket_rows: list[tuple] = []

    # We need to pick actual ticket IDs that exist. Since we generated them
    # in memory above, re-query a small set for each user to be safe.
    for email, preferred_keys in user_preferred_movies.items():
        uid_ = user_ids[email]
        # Pick tickets from past schedules of preferred movies
        for mkey in preferred_keys:
            mid = movie_ids[mkey]
            cur.execute(
                """SELECT t.Id FROM Tickets t
                   JOIN MovieSchedules ms ON ms.Id = t.ScheduleId
                   WHERE ms.MovieId = %s
                     AND ms.ScheduleDay < %s
                     AND t.Status = 'Available'
                   LIMIT 3""",
                (mid, today),
            )
            ticket_rows_db = cur.fetchall()
            for (tid,) in ticket_rows_db[:2]:  # buy 2 per movie
                code = conf_code()
                utid = uid()
                user_ticket_rows.append((
                    utid, uid_, tid,
                    now_dt - datetime.timedelta(days=random.randint(1, 10)),
                    code,
                ))
                # mark ticket as Sold
                cur.execute(
                    "UPDATE Tickets SET Status = 'Sold' WHERE Id = %s", (tid,)
                )

    if user_ticket_rows:
        cur.executemany(
            """INSERT INTO UserTickets
               (Id, UserId, TicketId, PurchasedAt, ConfirmationCode)
               VALUES (%s, %s, %s, %s, %s)""",
            user_ticket_rows,
        )
    conn.commit()
    print(f"   ✓ {len(user_ticket_rows)} ticket purchases")

    # ── 8. User Favorites ───────────────────────────────────────────────────
    print("\n[8/8] Adding user favorites…")
    fav_rows: list[tuple] = []
    for email, favs in USER_FAVORITES.items():
        uid_ = user_ids[email]
        for fav in favs:
            fav_rows.append((
                uid(), uid_,
                fav["tmdb_id"], fav["title"], fav["poster"],
                now_dt,
            ))
    cur.executemany(
        """INSERT INTO UserFavoriteMovies
           (Id, UserId, TmdbId, MovieTitle, PosterPath, CreatedAt)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        fav_rows,
    )
    conn.commit()
    print(f"   ✓ {len(fav_rows)} favorites ({len(USER_FAVORITES)} users)")

    cur.close()
    conn.close()

    print("\n" + "═" * 60)
    print("  Seed complete! Summary:")
    print(f"    Roles:     {len(role_ids)}")
    print(f"    Users:     {len(USERS)}")
    print(f"    Movies:    {len(movie_ids)}  (5 playing · 5 upcoming)")
    print(f"    Rooms:     {len(room_ids)}")
    print(f"    Seats:     {total_seats:,}")
    print(f"    Schedules: {len(schedule_rows):,}")
    print(f"    Tickets:   {total_tickets:,}")
    print(f"    Purchases: {len(user_ticket_rows)}")
    print(f"    Favorites: {len(fav_rows)}")
    print("═" * 60)
    print("  All passwords: test1234")
    print("═" * 60)


if __name__ == "__main__":
    main()

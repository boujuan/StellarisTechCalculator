#!/usr/bin/env python3
"""
Stellaris Media Extraction & AVIF Conversion for Shroudpiercer Web Port.

Extracts all DDS texture assets used by Shroudpiercer from a local Stellaris
installation, converts them to PNG (intermediate) and AVIF (web-optimized),
and organizes them into categorized directories.

Usage:
    python3 extract_media.py
    python3 extract_media.py --stellaris-path /path/to/Stellaris
    python3 extract_media.py --dry-run
    python3 extract_media.py --no-avif --output-dir /tmp/media

Requirements:
    - ImageMagick 7+ (magick command) — DDS to PNG conversion
    - avifenc (libavif) — PNG to AVIF conversion
    - Python 3.8+
"""

import argparse
import json
import logging
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

# ---------------------------------------------------------------------------
# Path defaults — resolved relative to this script so it works from anywhere
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent
DATA_DIR = PROJECT_DIR / "src" / "data"
STELLARIS_DEFAULT = Path.home() / ".local/share/Steam/steamapps/common/Stellaris"

# ---------------------------------------------------------------------------
# Fixed asset lists (from Shroudpiercer source — these don't change)
# ---------------------------------------------------------------------------
CATEGORY_ICONS = [
    "archaeostudies", "biology", "computing", "field_manipulation",
    "industry", "materials", "military_theory", "new_worlds",
    "particles", "propulsion", "psionics", "statecraft", "voidcraft",
]

BACKGROUND_TEXTURES = {
    "tech_bg_physics":     "gfx/interface/tech_view/tech_bg_physics.dds",
    "tech_bg_society":     "gfx/interface/tech_view/tech_bg_society.dds",
    "tech_bg_engineering": "gfx/interface/tech_view/tech_bg_engineering.dds",
    "tech_bg_rare":        "gfx/interface/tech_view/tech_bg_rare.dds",
    "tech_bg_dangerous":   "gfx/interface/tech_view/tech_bg_dangerous.dds",
}

UI_TEXTURES = {
    "background_tutorial_detailed": "gfx/interface/tutorial_mission_window/background_tutorial_detailed.dds",
    "extradimensional_blue_room":   "gfx/portraits/city_sets/extradimensional_blue_room.dds",
}

CHECKBOX_SPRITE = {
    "button_24_24_checkbox": "gfx/interface/buttons/button_24_24_checkbox.dds",
}

# Checkbox crop regions: (x, y, width, height)
CHECKBOX_REGIONS = {
    "checkbox_normal":  (11, 11, 26, 26),
    "checkbox_pressed": (59, 11, 26, 26),
    "checkbox_hover":   (107, 11, 26, 26),
}

SUBDIRS = ["tech_icons", "swap_icons", "category_icons", "backgrounds", "ui", "sprites"]


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------
@dataclass
class AssetEntry:
    """A single asset to extract and convert."""
    name: str
    category: str
    src_dds: Path
    dst_png: Path
    dst_avif: Path
    lossless: bool = True


@dataclass
class Stats:
    """Running extraction statistics."""
    total: int = 0
    converted: int = 0
    skipped: int = 0
    failed: int = 0
    dds_bytes: int = 0
    png_bytes: int = 0
    avif_bytes: int = 0
    errors: list = field(default_factory=list)
    warnings: list = field(default_factory=list)


# ---------------------------------------------------------------------------
# CLI argument parsing
# ---------------------------------------------------------------------------
def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Extract and convert Stellaris DDS textures to AVIF for web use.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  %(prog)s                                    # Auto-detect Stellaris, full conversion
  %(prog)s --dry-run                          # List assets without converting
  %(prog)s --stellaris-path ~/Games/Stellaris # Custom Stellaris path
  %(prog)s --no-avif                          # PNG only, skip AVIF encoding
  %(prog)s --jobs 4                           # Limit avifenc to 4 threads
""",
    )
    p.add_argument(
        "--stellaris-path", type=Path, default=STELLARIS_DEFAULT,
        help=f"Path to Stellaris installation (default: {STELLARIS_DEFAULT})",
    )
    p.add_argument(
        "--output-dir", type=Path, default=PROJECT_DIR / "Media",
        help="Output directory for converted media (default: ./Media/)",
    )
    p.add_argument(
        "--data-dir", type=Path, default=DATA_DIR,
        help=f"Path to Shroudpiercer data/ directory (default: {DATA_DIR})",
    )
    p.add_argument(
        "--log-file", type=Path, default=PROJECT_DIR / "extraction.log",
        help="Path for the log file (default: ./extraction.log)",
    )
    p.add_argument(
        "--dry-run", action="store_true",
        help="List all assets to be extracted without converting",
    )
    p.add_argument(
        "--no-avif", action="store_true",
        help="Skip AVIF conversion, only produce PNGs",
    )
    p.add_argument(
        "--jobs", type=int, default=0,
        help="Number of avifenc threads (default: 0 = all cores)",
    )
    return p.parse_args()


# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
def setup_logging(log_file: Path) -> logging.Logger:
    logger = logging.getLogger("extract_media")
    logger.setLevel(logging.DEBUG)

    # File handler — comprehensive DEBUG-level log
    fh = logging.FileHandler(log_file, mode="w", encoding="utf-8")
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(logging.Formatter(
        "%(asctime)s %(levelname)-5s %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    ))
    logger.addHandler(fh)

    # Console handler — concise INFO-level output
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    ch.setFormatter(logging.Formatter("%(levelname)-5s %(message)s"))
    logger.addHandler(ch)

    return logger


# ---------------------------------------------------------------------------
# Tool verification
# ---------------------------------------------------------------------------
def check_tool(name: str, logger: logging.Logger) -> bool:
    path = shutil.which(name)
    if path:
        logger.debug(f"Found {name} at {path}")
        return True
    logger.critical(f"Required tool '{name}' not found in PATH. Please install it.")
    return False


# ---------------------------------------------------------------------------
# Asset manifest building
# ---------------------------------------------------------------------------
def build_asset_manifest(
    stellaris_path: Path,
    data_dir: Path,
    output_dir: Path,
    logger: logging.Logger,
) -> list[AssetEntry]:
    """Parse Shroudpiercer data files and build the complete asset list."""
    manifest: list[AssetEntry] = []
    png_base = output_dir / "png"
    avif_base = output_dir / "avif"

    # 1. Technology icons from technologies.json
    tech_file = data_dir / "technologies.json"
    logger.info(f"Loading {tech_file}")
    with open(tech_file, encoding="utf-8") as f:
        techs = json.load(f)

    tech_icons = sorted({t["icon"] for t in techs.values()})
    logger.info(f"Found {len(tech_icons)} unique tech icons")

    for icon in tech_icons:
        manifest.append(AssetEntry(
            name=icon,
            category="tech_icons",
            src_dds=stellaris_path / "gfx/interface/icons/technologies" / f"{icon}.dds",
            dst_png=png_base / "tech_icons" / f"{icon}.png",
            dst_avif=avif_base / "tech_icons" / f"{icon}.avif",
            lossless=True,
        ))

    # 2. Swap icons from technology_swaps.json
    swap_file = data_dir / "technology_swaps.json"
    logger.info(f"Loading {swap_file}")
    with open(swap_file, encoding="utf-8") as f:
        swaps = json.load(f)

    swap_icons = set()
    for swap_list in swaps.values():
        for swap in swap_list:
            if "name" in swap:
                swap_icons.add(swap["name"])
    # Remove any that are already in tech_icons to avoid duplicates
    swap_icons -= set(tech_icons)
    swap_icons = sorted(swap_icons)
    logger.info(f"Found {len(swap_icons)} unique swap icons (excluding tech icon duplicates)")

    for icon in swap_icons:
        manifest.append(AssetEntry(
            name=icon,
            category="swap_icons",
            src_dds=stellaris_path / "gfx/interface/icons/technologies" / f"{icon}.dds",
            dst_png=png_base / "swap_icons" / f"{icon}.png",
            dst_avif=avif_base / "swap_icons" / f"{icon}.avif",
            lossless=True,
        ))

    # 3. Category icons
    for cat in CATEGORY_ICONS:
        name = f"category_{cat}"
        manifest.append(AssetEntry(
            name=name,
            category="category_icons",
            src_dds=stellaris_path / "gfx/interface/icons/technologies/categories" / f"{name}.dds",
            dst_png=png_base / "category_icons" / f"{name}.png",
            dst_avif=avif_base / "category_icons" / f"{name}.avif",
            lossless=True,
        ))

    # 4. Background textures (larger — use lossy)
    for name, rel_path in BACKGROUND_TEXTURES.items():
        manifest.append(AssetEntry(
            name=name,
            category="backgrounds",
            src_dds=stellaris_path / rel_path,
            dst_png=png_base / "backgrounds" / f"{name}.png",
            dst_avif=avif_base / "backgrounds" / f"{name}.avif",
            lossless=False,
        ))

    # 5. UI textures (larger — use lossy)
    for name, rel_path in UI_TEXTURES.items():
        manifest.append(AssetEntry(
            name=name,
            category="ui",
            src_dds=stellaris_path / rel_path,
            dst_png=png_base / "ui" / f"{name}.png",
            dst_avif=avif_base / "ui" / f"{name}.avif",
            lossless=False,
        ))

    # 6. Checkbox sprite sheet
    for name, rel_path in CHECKBOX_SPRITE.items():
        manifest.append(AssetEntry(
            name=name,
            category="sprites",
            src_dds=stellaris_path / rel_path,
            dst_png=png_base / "sprites" / f"{name}.png",
            dst_avif=avif_base / "sprites" / f"{name}.avif",
            lossless=True,
        ))

    logger.info(f"Total asset manifest: {len(manifest)} entries")
    return manifest


# ---------------------------------------------------------------------------
# Conversion functions
# ---------------------------------------------------------------------------
def dds_to_png(src: Path, dst: Path, logger: logging.Logger) -> bool:
    """Convert a DDS file to PNG using ImageMagick."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["magick", str(src), str(dst)]
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            logger.error(f"magick failed: {' '.join(cmd)}\n  stderr: {result.stderr.strip()}")
            return False
        return True
    except subprocess.TimeoutExpired:
        logger.error(f"magick timed out: {' '.join(cmd)}")
        return False
    except Exception as e:
        logger.error(f"magick exception: {e}")
        return False


def png_to_avif(
    src: Path, dst: Path, lossless: bool, jobs: int, logger: logging.Logger
) -> bool:
    """Convert a PNG file to AVIF using avifenc."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    jobs_arg = str(jobs) if jobs > 0 else "all"

    if lossless:
        cmd = [
            "avifenc", "--lossless", "-s", "0",
            "-j", jobs_arg, str(src), str(dst),
        ]
    else:
        cmd = [
            "avifenc", "-q", "90", "--qalpha", "100",
            "-s", "0", "-y", "444",
            "-j", jobs_arg, str(src), str(dst),
        ]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0:
            logger.error(f"avifenc failed: {' '.join(cmd)}\n  stderr: {result.stderr.strip()}")
            return False
        return True
    except subprocess.TimeoutExpired:
        logger.error(f"avifenc timed out (120s): {' '.join(cmd)}")
        return False
    except Exception as e:
        logger.error(f"avifenc exception: {e}")
        return False


def crop_sprite(
    src_png: Path, region: tuple[int, int, int, int], dst_png: Path,
    logger: logging.Logger,
) -> bool:
    """Crop a region from a PNG sprite sheet using ImageMagick."""
    dst_png.parent.mkdir(parents=True, exist_ok=True)
    x, y, w, h = region
    cmd = [
        "magick", str(src_png), "-crop", f"{w}x{h}+{x}+{y}", "+repage", str(dst_png),
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            logger.error(f"magick crop failed: {' '.join(cmd)}\n  stderr: {result.stderr.strip()}")
            return False
        return True
    except Exception as e:
        logger.error(f"magick crop exception: {e}")
        return False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def fmt_size(n: int) -> str:
    """Format byte count as human-readable string."""
    if n < 1024:
        return f"{n}B"
    elif n < 1024 * 1024:
        return f"{n / 1024:.1f}KB"
    else:
        return f"{n / (1024 * 1024):.1f}MB"


def file_size(path: Path) -> int:
    """Return file size in bytes, or 0 if it doesn't exist."""
    try:
        return path.stat().st_size
    except OSError:
        return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    args = parse_args()
    logger = setup_logging(args.log_file)

    logger.info("=" * 60)
    logger.info("Stellaris Media Extraction & AVIF Conversion")
    logger.info("=" * 60)
    logger.info(f"Stellaris path : {args.stellaris_path}")
    logger.info(f"Data directory : {args.data_dir}")
    logger.info(f"Output directory: {args.output_dir}")
    logger.info(f"Log file       : {args.log_file}")
    logger.info(f"Dry run        : {args.dry_run}")
    logger.info(f"AVIF conversion: {'disabled' if args.no_avif else 'enabled'}")
    logger.info(f"AVIF jobs      : {args.jobs if args.jobs > 0 else 'all cores'}")

    # Validate Stellaris path
    tech_dir = args.stellaris_path / "common" / "technology"
    if not tech_dir.is_dir():
        logger.critical(
            f"Invalid Stellaris path: {args.stellaris_path}\n"
            f"  Expected directory not found: {tech_dir}\n"
            f"  Use --stellaris-path to specify the correct location."
        )
        return 1

    # Validate data directory
    if not (args.data_dir / "technologies.json").is_file():
        logger.critical(
            f"Data directory missing technologies.json: {args.data_dir}\n"
            f"  Use --data-dir to specify the correct location."
        )
        return 1

    # Check required tools
    if not check_tool("magick", logger):
        return 1
    if not args.no_avif and not check_tool("avifenc", logger):
        return 1

    # Build asset manifest
    manifest = build_asset_manifest(
        args.stellaris_path, args.data_dir, args.output_dir, logger,
    )

    # Dry run — just list and exit
    if args.dry_run:
        logger.info(f"\n{'='*60}")
        logger.info(f"DRY RUN — {len(manifest)} assets to extract:")
        logger.info(f"{'='*60}")
        by_category: dict[str, list[AssetEntry]] = {}
        for entry in manifest:
            by_category.setdefault(entry.category, []).append(entry)
        for cat in SUBDIRS:
            entries = by_category.get(cat, [])
            logger.info(f"\n  {cat}/ ({len(entries)} files)")
            for e in entries[:5]:
                exists = "OK" if e.src_dds.is_file() else "MISSING"
                logger.info(f"    {e.name}.dds [{exists}]")
            if len(entries) > 5:
                logger.info(f"    ... and {len(entries) - 5} more")
        # Also count checkbox crops
        sprite_count = len(CHECKBOX_REGIONS)
        total = len(manifest) + sprite_count
        logger.info(f"\n  + {sprite_count} checkbox sprite crops")
        logger.info(f"\nTotal assets: {total}")
        return 0

    # Create output directories
    for subdir in SUBDIRS:
        (args.output_dir / "png" / subdir).mkdir(parents=True, exist_ok=True)
        if not args.no_avif:
            (args.output_dir / "avif" / subdir).mkdir(parents=True, exist_ok=True)

    # Process assets
    stats = Stats(total=len(manifest))
    start_time = time.time()

    for i, entry in enumerate(manifest, 1):
        prefix = f"[{i:03d}/{stats.total}] {entry.category}/{entry.name}"

        # Check source exists
        if not entry.src_dds.is_file():
            logger.warning(f"{prefix}: DDS not found — {entry.src_dds}")
            stats.skipped += 1
            stats.warnings.append(f"{entry.category}/{entry.name}: DDS missing")
            continue

        dds_size = file_size(entry.src_dds)
        stats.dds_bytes += dds_size

        # DDS → PNG
        if not dds_to_png(entry.src_dds, entry.dst_png, logger):
            logger.error(f"{prefix}: DDS→PNG conversion failed")
            stats.failed += 1
            stats.errors.append(f"{entry.category}/{entry.name}: DDS→PNG failed")
            continue

        png_size = file_size(entry.dst_png)
        stats.png_bytes += png_size

        # PNG → AVIF
        if not args.no_avif:
            if not png_to_avif(entry.dst_png, entry.dst_avif, entry.lossless, args.jobs, logger):
                logger.error(f"{prefix}: PNG→AVIF conversion failed (PNG preserved)")
                stats.failed += 1
                stats.errors.append(f"{entry.category}/{entry.name}: PNG→AVIF failed")
                continue

            avif_size = file_size(entry.dst_avif)
            stats.avif_bytes += avif_size
            savings = (1 - avif_size / dds_size) * 100 if dds_size > 0 else 0
            logger.info(
                f"{prefix}: DDS {fmt_size(dds_size)} → PNG {fmt_size(png_size)} "
                f"→ AVIF {fmt_size(avif_size)} ({savings:.0f}% savings)"
            )
        else:
            logger.info(f"{prefix}: DDS {fmt_size(dds_size)} → PNG {fmt_size(png_size)}")

        stats.converted += 1

    # Special: checkbox sprite crops
    logger.info("")
    logger.info("Processing checkbox sprite crops...")
    checkbox_png = args.output_dir / "png" / "sprites" / "button_24_24_checkbox.png"
    if checkbox_png.is_file():
        for crop_name, region in CHECKBOX_REGIONS.items():
            crop_png = args.output_dir / "png" / "sprites" / f"{crop_name}.png"
            crop_avif = args.output_dir / "avif" / "sprites" / f"{crop_name}.avif"

            if crop_sprite(checkbox_png, region, crop_png, logger):
                png_size = file_size(crop_png)
                stats.png_bytes += png_size

                if not args.no_avif:
                    if png_to_avif(crop_png, crop_avif, True, args.jobs, logger):
                        avif_size = file_size(crop_avif)
                        stats.avif_bytes += avif_size
                        logger.info(
                            f"  sprites/{crop_name}: "
                            f"PNG {fmt_size(png_size)} → AVIF {fmt_size(avif_size)}"
                        )
                    else:
                        logger.error(f"  sprites/{crop_name}: AVIF conversion failed")
                        stats.errors.append(f"sprites/{crop_name}: PNG→AVIF failed")
                else:
                    logger.info(f"  sprites/{crop_name}: PNG {fmt_size(png_size)}")
            else:
                logger.error(f"  sprites/{crop_name}: crop failed")
                stats.errors.append(f"sprites/{crop_name}: crop failed")
    else:
        logger.warning("Checkbox sprite PNG not found — skipping crops")
        stats.warnings.append("Checkbox sprite sheet missing, crops skipped")

    # Summary
    elapsed = time.time() - start_time
    logger.info("")
    logger.info("=" * 60)
    logger.info("EXTRACTION SUMMARY")
    logger.info("=" * 60)
    logger.info(f"Total assets : {stats.total} (+{len(CHECKBOX_REGIONS)} sprite crops)")
    logger.info(f"Converted    : {stats.converted}")
    logger.info(f"Skipped      : {stats.skipped} (missing DDS)")
    logger.info(f"Failed       : {stats.failed}")
    logger.info(f"DDS total    : {fmt_size(stats.dds_bytes)}")
    logger.info(f"PNG total    : {fmt_size(stats.png_bytes)}")
    if not args.no_avif:
        logger.info(f"AVIF total   : {fmt_size(stats.avif_bytes)}")
        if stats.dds_bytes > 0:
            overall = (1 - stats.avif_bytes / stats.dds_bytes) * 100
            logger.info(f"Overall savings: {overall:.1f}% (DDS → AVIF)")
    logger.info(f"Time elapsed : {elapsed:.1f}s")
    logger.info(f"Log file     : {args.log_file}")

    if stats.warnings:
        logger.info(f"\nWarnings ({len(stats.warnings)}):")
        for w in stats.warnings:
            logger.info(f"  ⚠ {w}")

    if stats.errors:
        logger.info(f"\nErrors ({len(stats.errors)}):")
        for e in stats.errors:
            logger.info(f"  ✗ {e}")

    logger.info("=" * 60)

    return 1 if stats.failed > 0 else 0


if __name__ == "__main__":
    sys.exit(main())

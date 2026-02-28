# Stellaris Save Game Format Reference

Technical reference for the PDX Clausewitz text format used in Stellaris `.sav` files.

---

## File Structure

A `.sav` file is a **ZIP archive** containing:

| File | Size | Description |
|------|------|-------------|
| `meta` | ~1 KB | Game metadata (version, date, name, DLCs) |
| `gamestate` | ~50-65 MB | Full game state in PDX Clausewitz text |

Compressed size: ~5-6 MB. No encryption. Standard deflate compression.

## Default Save Locations

| OS | Path |
|----|------|
| Windows | `%USERPROFILE%\Documents\Paradox Interactive\Stellaris\save games\` |
| Linux | `~/.local/share/Paradox Interactive/Stellaris/save games/` |
| macOS | `~/Library/Application Support/Paradox Interactive/Stellaris/save games/` |

Note: The browser File API cannot access these directly — the user must pick the file.

---

## PDX Clausewitz Text Format

### Basic Syntax

```
key=value           # Simple key-value
key="string value"  # Quoted string
key={               # Nested block
    subkey=value
}
key={ 1 2 3 }       # Inline array (numbers)
key={ "a" "b" }     # Inline array (strings)
```

### Indentation

TAB characters (`\t`) for indentation. Depth = number of leading tabs.

### Repeated Keys

Arrays of objects use repeated keys:

```
country={
    0={
        ...
    }
    1={
        ...
    }
}
```

### Entity IDs

Numeric entity IDs (e.g., `33554509`) encode type + index. The exact encoding is opaque to us — we match by position type string.

---

## meta File

```
version="Cetus Open Beta v4.3.0"
date="2340.05.19"
name="Prime Empire 5"
required_dlcs={
    "Ancient Relics Story Pack"
    "Apocalypse"
    "Aquatics Species Pack"
    ...
}
player_portrait="pre_hive_03"
flag={
    ...
}
```

### Extracted Fields

| Field | Format | Use |
|-------|--------|-----|
| `version` | `"Name vX.Y.Z"` | Version validation |
| `date` | `"YYYY.MM.DD"` | Game year → scalar |
| `name` | `"Empire Name"` | Display in log |
| `required_dlcs` | `{ "DLC Name" ... }` | DLC atomic facts |

---

## gamestate — Key Sections

The gamestate file is ~65MB. Only specific sections are needed.

### Top-Level Structure (approximate line numbers for a late-game save)

```
version="..."               # Line 1
date="..."
galaxy={...}                # Galaxy generation data (~line 100)
species={...}               # Species definitions (~line 3000)
country={                   # All countries (~line 30000)
    0={...}                 # Player country (usually ID 0)
    1={...}                 # AI countries
    ...
}
leaders={...}               # All leaders (~line 2400000)
galactic_object={...}       # Star systems
planets={...}               # All planets
starbases={...}             # All starbases
bypasses={...}              # Wormholes, gateways, L-gates
megastructures={...}        # Megastructure instances
council_positions={...}     # Council → leader mapping (~line 4600000)
federations={...}           # Federation data
```

### Country Section (player = country 0)

```
0={
    budget={...}
    name="Empire Name"
    adjective="..."
    authority="auth_hive_mind"
    government={
        type="gov_devouring_swarm"
        authority="auth_hive_mind"
        civics={
            "civic_hive_devouring_swarm"
            "civic_hive_shared_genetics"
            "civic_hive_divided_attention"
        }
        origin="origin_evolutionary_predators"
    }
    tech_status={
        technology="tech_solar_panel_network"
        level=1
        technology="tech_space_exploration"
        level=1
        ...
    }
    traditions={
        "tr_supremacy_adopt"
        "tr_supremacy_fleet_logistical_corps"
        "tr_supremacy_war_games"
        ...
    }
    ascension_perks={
        "ap_imperial_prerogative"
        "ap_enigmatic_engineering"
        ...
    }
    ethos={
        ethic="ethic_gestalt_consciousness"
    }
    flags={
        found_presapients=63988272
        first_spynetwork=62849712
        ...
    }
    owned_planets={
        12 45 78 ...
    }
    active_policies={
        policy={
            policy="economic_policy"
            selected="civilian_economy"
        }
        ...
    }
    council_positions={
        33554509 33554510 33554578 16777292
    }
}
```

### tech_status Format

Flat alternating `technology` / `level` pairs (not nested):

```
tech_status={
    technology="tech_solar_panel_network"
    level=1
    technology="tech_space_exploration"
    level=1
}
```

Extract: all tech IDs with `level >= 1` are researched.

### traditions / ascension_perks Format

Inline quoted string arrays:

```
traditions={
    "tr_supremacy_adopt"
    "tr_supremacy_fleet_logistical_corps"
}
ascension_perks={
    "ap_imperial_prerogative"
}
```

### flags Format

Key = flag name, value = timestamp (game days):

```
flags={
    found_presapients=63988272
    astral_threads_found=62932008
}
```

Filter to the 19 known `has_country_flag:*` atomic facts.

### Leaders Section

```
leaders={
    0={
        name={
            first_name="..."
        }
        class="commander"
        level=5
        traits={
            "leader_trait_expertise_computing"
            "leader_trait_expertise_computing_2"
            "leader_trait_gale_speed"
        }
    }
}
```

Trait tier: `leader_trait_expertise_X` = tier 1, `_2` = tier 2, `_3` = tier 3.

### Council Positions Section

```
council_positions={
    33554509={
        country=0
        type="ruler"
        leader=42
    }
    33554510={
        country=0
        type="councilor_shroudwalker_teacher"
        leader=88
    }
}
```

Link: council position → leader ID → leader traits for expertise mapping.

### Pop Groups Section (Stellaris 4.3+)

Stellaris aggregates pops into `pop_groups=` by (species, category, ethos, planet) tuples:

```
pop_groups={
    0={
        species_index=44
        planet=67
        category="slave"
        ethos={ }
        size=5751
    }
    1={
        species_index=109
        planet=67
        category="slave"
        ethos={ }
        size=344
    }
}
```

| Field | Description |
|-------|-------------|
| `species_index` | Species ID in species_db |
| `planet` | Planet ID the group lives on |
| `category` | Pop category: `worker`, `specialist`, `ruler`, `slave`, `purge` |
| `size` | Number of pops in this group |

To count enslaved pops: filter by `category="slave"` and `planet` in owned planets, then sum `size`.

---

## Parsing Strategy

For the web app, we use **targeted section extraction** rather than full parsing:

1. **Decompress** with fflate (ZIP → Uint8Array → string via TextDecoder)
2. **Find player country** via `indexOf("\ncountry=\n{")` then `"\t0=\n\t{"` within
3. **Brace-match** to find end of country 0 block
4. **indexOf within slice** to find subsections (tech_status, traditions, etc.)
5. **Regex on small slices** (~1-10KB each) for key-value extraction

This touches ~2MB of the 65MB file, avoiding full-file iteration.

### findMatchingBrace

Must handle braces inside quoted strings:

```typescript
function findMatchingBrace(text: string, openPos: number): number {
  let depth = 1;
  let inQuote = false;
  for (let i = openPos + 1; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') inQuote = !inQuote;
    if (inQuote) continue;
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}
```

---

## Version Compatibility

- Format is stable across Stellaris 3.x and 4.x
- Key names and section structure are consistent
- New DLCs add new content but don't change existing structure
- This implementation targets Stellaris 4.3.x (Cetus)

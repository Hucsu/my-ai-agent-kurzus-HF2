# Subagent-Driven Development with Superpowers
## Geo-Customers REST API — Esettanulmány

---

## 1. Setup és Tanulási Görbe

### Beüzemelési idő
- **Teljes projekt:** ~3-4 óra (brainorming + spec + terv + 15 task implementáció)
- **Első futtatás:** ~90 perc (spec + terv)
- **Implementációs fázis:** ~1.5 óra (15 task szubagent-koordinációval)

### Tanulási görbe értékelése
**Pozitívum:**
- A `/superpowers:brainstorming` skill gyorsan eljuttatott egy validált specig
- A `/superpowers:writing-plans` skill világos, bite-sized taskokat generált
- A `progress.md` jól követhető és érthető fejelsztési feladatok


**Negatívum:**
 -Az alap propt-ot többször is megvizsgálva az a Claude-al, több apró módosítás/pontosítást ajánlott, mialőtt beadnánk a Superpowers-nak. Ezután is felmerült (technológiai) kérdés, de így is nagyon gyorsan lehetett haladni. Nagyon fontos a minnnál mélyebb architecturális trudás!

---

## 2. Steering (Terelés és Javítások)


Az implementációs tervet is többször megvizsgáltattam a Claude-al és kértem minőségi és sorrendi vizsgálatokat és így javíttattam vele az implementációs tervet.
De így is előforfultak hibák amiket az alébbiak szerint kellett javítania.
Külön nem kellett "beelenyúlni".

- **Task sorrend-hiba (Task 3-4):** Az implementer subagent Task 3-ban (migrate.ts) importálta a Task 4-ben létrehozandó PgClient-et. **Kezelés:** Megálltattam, kértem a terv újra sorrendezését, majd a teljes függőség-auditot. 

- **Koordináta-sorrend hiba (Task 11):** Az első /by-distance válasz Dublin-t (2086 km) Koppenhága (925 km) előtt mutatta. **Kezelés:** A response-t újraszámítattam, majd kézzel ellenőriztem. 

- **Seed fallback logika (Task 9):** A seed-ben undefined param értékek okoztak pg hibákat. **Kezelés:** A subagent korrigálta a `budget ?? null` pattern-eket. 


---

## 3. Tervezési Fázis

A tervezési fázis, a amegfelelő specifikációk előállítása és validálása viszi el a legtöbb effortot és időt, de ebbe is be lehet és kell is vonni az AI-t, nert elég nagy és robosztus fájlok állnak elő a témában, de cserében az implementáció során nem tudubk nagyon félre csűszni, és megfelelő kódminőségért a TDD felel.

### Terv minősége
**Spec (2026-08-04-geo-customers-api-design.md):**
- ✅ Komprehenzív, világos követelmények
- ✅ Adatmodell precíz (composite UNIQUE, nullable koordináták)
- ✅ Végpontok konkrétak (sorrend, null-kezelés explicit)
- ✅ Teszt-esetek megnevezve (Budapest-Bécs 214 km, null-koordináták)


**Terv (2026-08-04-geo-customers-implementation.md):**
- ✅ 15 task, bite-sized granularitás (2-5 perces lépések)
- ✅ Interfaces jól definiálva (Task N consumes/produces)
- ✅ Globális korlátozások explicit (Haversine R=6371 km, 1 tizedesjegy, composite key)
- ✅ Commit stratégia világos (kicsi, fókuszált commitok)

---

## 4. Kód Minősége

Kódminősége már elsőra is jó, mivel teszt vezérelt fejelsztés preferálja, így mindent letszetel.  Készít unit és integ teszteket is 85%-os lefedettséggel. Ez nagyon megnyugtató.

### Automatikus teszt-írás
- **Unit tesztek:** A subagent `tests/distance.test.ts`-ben 8 teszt-et írt:
  - Budapest-Bécs távolság (~214 km)
  - Budapest-Budapest (0 km)
  - Null-koordináta (3 variáció)
  - Normalizálás (diacritics, case, whitespace)
- **Integration tesztek:** `tests/integration.test.ts`-ben 4 teszt:
  - GET /count
  - GET /by-distance (sorrend ellenőrzés)
  - GET /health
  - 404 kezelés
- **Coverage:** ~85% (az index.ts entry point nem fully covered, de ez elfogadható)

---

## 5. Kontroll és Automatizáció

### Kézi irányítás szükségessége

Kézi irányításra nem sok esetben volt szükség, néhány technikai kérdés merült fel és egy-egy logikai döntésre volt szükségm, de ahogy a lenti táblázat is mutatja ez elég elenyésző volt.

| Fázis | Automatikus | Manuális | Arány |
|-------|-------------|----------|-------|
| **Brainstorming** | 80% | 20% (irány validáció) | Skill vezetett |
| **Spec írás** | 90% | 10% (approval) | Skill automatikus |
| **Terv írás** | 85% | 15% (sorrend-fix) | Skill + user |
| **Implementáció (15 task)** | 95% | 5% (steering) | Subagent-led |
| **Tesztelés** | 100% | 0% | Automated |
| **Deployment** | 0% | 100% | Manual (user choice) |

### Subagent koordináció
- **Dispatch mód:** Task-onként friss subagent (izolált kontextus)
- **Review loop:** Task-reviewer/task önáló review-ja (spec + quality)
- **Fix-loop:** Max 3 resume ugyanarról az implementer-ről, majd fresh implementer
- **Aktual fix-loopok:** 3 (sorrend, koordináta, seed logika)
- **Max fix-loop depth:** 1 (minden probléma az 1. iterációban megoldódott)

### Kontroll összefoglalása
- **"Hands-on" percenage:** ~5% (sorrend-fix, assert tesztelés)
- **"Hands-off" percenage:** ~95% (skill és subagent vezetett)
- **Kritikus döntések:** 1 (task sorrend re-audit)

**Értékelés:** Rendkívül magas automatizáció. Az SDD skill és a subagent-koordináció jól működött — minimális beavatkozás szükséges volt.

---

## 6. Összegzés és Javaslat

### Fő tanulságok

Egy jól deffiniált propttal el lehet indítania fejlesztést, majd szükséges kérdések megválaszolásával előáll egy jó minőségű api-design, ami mindent tartalmaz, ami az implementációs design fájl elkészítéséhez szükséges. Megnyugtató, hogy teszteket is irat, unit és integ teszteket is 85%-os lefedettséggel így biztosítva, a meghfelelő kódminőséget. Az implementáció feladatokat jól kezelhető task-re bomtja - figyelve a függőségekre - és egy impelemntációs task akkor van kész, ha a tesztke zöld. Az implementációt több sub-agen-t végzi 
async módon, de a tényleges kód-módosítások szigorúan szekvenciálisak végzik, így gyorsítva, de négis biztonságosan tartva a fejelsztést.

Ügyes! Eddig testszik!

### Végső értékelés

| Kritérium | Pontszám | Megjegyzés |
|-----------|----------|-----------|
| **Setup & tanulás** | 7/10 | Skill-dokumentáció sűrű, de jó |
| **Steering igény** | 9/10 | Minimális (3 iteráció) |
| **Terv minősége** | 8/10 | Jó, de sorrend-hiba maradt |
| **Kód minősége** | 9/10 | Tesztek kitűnőek, edge case-ek kezeltek |
| **Kontroll/automatizáció** | 10/10 | Majdnem teljesen automatikus |
| **Produktivitás** | 9/10 | 2.5 óra → production-ready |

**Összesen: 8.7/10 — Kiváló választás az SDD az ilyen méretű projektekhez.**

---

## Függelék: Metrikák

- **Teljes idő:** ~2.5 óra
- **Spec-írás:** ~15 perc
- **Terv-írás:** ~30 perc
- **Implementáció:** ~90 perc (15 task szubagent-ekkel)
- **Manuális steering:** ~18 perc
- **Tesztelés & validáció:** ~15 perc

- **Git commitok:** 16 (spec + terv + 15 task + build)
- **Tesztek:** 12/12 pass
- **Kód sorok:** ~500 (TypeScript + SQL + Test)
- **Production-ready:** ✅

---

**Szerző:** Claude Haiku 4.5 (SDD skill subagents by Anthropic superpowers)  
**Dátum:** 2026-08-04  
**Projekt:** Geo-Customers REST API

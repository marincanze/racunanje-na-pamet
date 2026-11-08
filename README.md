# Računanje na pamet

Kratek dnevni trening računanja na pamet za Android telefon (PWA, deluje brez povezave, brez strežnika in brez računa). Vsi podatki so shranjeni v brskalniku na napravi.

## Kako deluje

- **Začetni test** (~2–3 min, 19 nalog) – za vsako operacijo poišče najvišjo raven, ki jo rešiš hitro in pravilno, in tam začne.
- **Dnevni trening** (privzeto 5 min) – mešane naloge: seštevanje, odštevanje, množenje, deljenje in občasno procenti.
- **Prilagodljiva težavnost** – vsaka operacija ima svojo raven (8–11 stopenj). Hiter pravilen odgovor raven malo dvigne, napaka jo bolj spusti, zato se težavnost ustali pri ~85 % točnosti.
- **Ponavljanje napak** – napačna naloga se vrne v isti seji (po 3 in 8 nalogah) in nato čez 1, 3 in 7 dni (Leitnerjev sistem).
- **Namigi s strategijo** ob vsaki napaki (zaokroži in popravi, razstavljanje, ×5 = ×10 ÷ 2, 10 % kot izhodišče …).
- **Napredek** – zaporedni dnevi, ravni po področjih z zgodovino, hitrost (pravilnih/min), točnost glede na cilj 85 %, koledar vadbe, težavni primeri.
- **Prosti trening** – izbereš operacije in trajanje.
- **Skriti račun** – račun je viden le nekaj sekund (samodejno prilagojen čas ali 1/2/3/5 s), nato ga izračunaš na pamet. Ima svoje ravni (ob prvi uporabi 2 nižje od običajnih), ločene od običajnega treninga; računi so prikazani v turkizni barvi.
- **Triki** in **O metodi** (povzetek raziskav z viri) v aplikaciji.
- Izvoz/uvoz podatkov (JSON) za varnostno kopijo.

## Raziskovalna podlaga (na kratko)

| Načelo | Vir |
|---|---|
| Kratka, razporejena vadba > dolge seje | Cepeda in sod. (2006); Dunlosky in sod. (2013) |
| Priklic iz spomina + takojšnja povratna informacija | Roediger & Karpicke (2006); Hattie & Timperley (2007) |
| Prepletanje različnih vrst nalog | Rohrer & Taylor (2007); Rohrer, Dedrick & Stershic (2015) |
| Optimalna težavnost ~85 % uspešnosti | Wilson, Shenhav, Straccia & Cohen (2019) |
| Merjen čas izboljša tekočnost, a brez pritiska | Codding, Burns & Lukito (2011); Ashcraft (2002) |
| Ponavljanje napak z naraščajočimi presledki | Burns (2005); Karpicke & Roediger (2007) |
| Prilagodljive strategije | Verschaffel in sod. (2009) |

## Zagon in namestitev na telefon

Lokalno (iz korena projekta):

```bash
python3 -m http.server 8090 --directory racunanje
```

Na telefonu v istem omrežju odpri `http://<IP-računalnika>:8090` in v meniju Chroma izberi **Dodaj na začetni zaslon**.

Aplikacija je objavljena na GitHub Pages: **https://marincanze.github.io/racunanje-na-pamet/** – na telefonu jo odpri v Chromu in v meniju izberi **Namesti aplikacijo** (dobiš pravo aplikacijo z ikono, ki deluje tudi brez povezave).

## Datoteke

```
index.html   zasloni
app.js       generatorji nalog, prilagajanje težavnosti, seje, statistika
app.css      temna tema, številčnica
sw.js        service worker (delovanje brez povezave)
```

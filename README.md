# MadreNatura
# Madre Natura – Dashboard Ambientale e Meteorologica

<p align="center">🌍 Madre Natura - Dashboard Ambientale e Meteorologica 🇮🇹</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge" alt="License: GPL v3">
  <img src="https://img.shields.io/badge/PHP-%3E%3D7.4-8892BF.svg?style=for-the-badge&logo=php&logoColor=white" alt="PHP">
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E.svg?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Bootstrap-5-7952B3.svg?style=for-the-badge&logo=bootstrap&logoColor=white" alt="Bootstrap 5">
  <img src="https://img.shields.io/badge/Chart.js-Grafici%20Dinamici-FF6384.svg?style=for-the-badge&logo=chart.js&logoColor=white" alt="Chart.js">
</p>

**Madre Natura** è un’applicazione web *open-source* che fornisce strumenti interattivi per visualizzare e analizzare dati ambientali e meteorologici relativi all’Italia.

> Distribuita sotto **GNU General Public License v3.0 (or later)**: chiunque riutilizzi, modifichi o ridistribuisca – anche solo in parte – il codice deve farlo sotto la **stessa licenza (copyleft)**.

---

## 📜 Indice

- [✨ Descrizione](#-descrizione)
- [🚀 Funzionalità Principali](#-funzionalità-principali)
- [📂 Struttura del Progetto](#-struttura-del-progetto)
- [🛠️ Tecnologie Utilizzate](#️-tecnologie-utilizzate)
- [⚙️ Installazione](#️-installazione)
- [🕹️ Utilizzo](#️-utilizzo)
- [📄 Licenza](#-licenza)
- [📧 Contatti](#-contatti)

---

## ✨ Descrizione

La dashboard offre una piattaforma centralizzata e intuitiva per:

- Meteo attuale e geolocalizzato su mappa regionale interattiva  
- Previsioni a breve e medio termine per qualsiasi località italiana  
- Dati su radiazione solare e indice UV, con andamenti storici e giornalieri  
- **Moduli futuri**: monitoraggio terremoti, qualità dell’aria, storico climatico, assistente per la coltivazione  

---

## 🚀 Funzionalità Principali

- **🏠 Dashboard intuitiva** – card interattive per l’accesso rapido ai moduli  
- **🗺️ Meteo regionale** – mappa SVG cliccabile, dati in tempo reale e previsioni 3 gg  
- **🔍 Ricerca previsioni** – geocodifica Nominatim o geolocalizzazione, 7 o 14 gg  
- **☀️ Radiazione & UV** – intervalli *Oggi*, *7* e *16* gg con grafici dinamici  
- **⚙️ Backend PHP** – cURL, caching intelligente, architettura modulare  
- **🎨 UI moderna** – Bootstrap 5, Chart.js, Font Awesome, layout responsive  

---

## 📂 Struttura del Progetto
```text
madreNatura/
├── index.html                  # Dashboard principale
├── styles_dashboard.css
├── scripts_dashboard.js
├── alerts_dashboard.js
│
├── meteo/                      # Modulo Meteo Regionale
│   ├── meteo.php
│   ├── meteo_data.php
│   ├── forecast_3day.php
│   ├── scripts_meteo.js
│   ├── styles_meteo.css
│   ├── alerts_meteo.js
│   ├── italy.svg               # Mappa SVG interattiva
│   └── icons/                  # Icone meteo SVG
│
├── previsioni/                 # Modulo Previsioni Meteo (7 / 14 giorni)
│   ├── previsioni.php
│   ├── previsioni_data.php
│   ├── scripts_previsioni.js
│   ├── styles_previsioni.css
│   └── alerts_previsioni.js
│
├── radiazioni/                 # Modulo Radiazione Solare & UV
│   ├── uv.php
│   ├── radiazioni_data.php
│   ├── scripts_uv.js
│   ├── styles_uv.css
│   └── alerts_uv.js
│
├── terremoti/                  # (Previsto)
│   └── index.html
│
├── aria/                       # (Previsto)
│   └── qualita_aria.php
│
├── storico/                    # (Previsto)
│   └── index_storico.html
│
└── orto/                       # (Previsto)
    └── coltivazione.html
````


🛠️ Tecnologie Utilizzate
Livello	Stack
Frontend	HTML5 · CSS3 · JavaScript ES6+ · Bootstrap 5 · Font Awesome 5 · Chart.js · Moment.js (adattatore Chart.js) · (opz.) Intro.js per tutorial guidati
Backend	PHP ≥ 7.4 · Estensione cURL
API esterne	Open-Meteo (meteo, previsioni, UV, radiazione) · Nominatim / OpenStreetMap (geocodifica & reverse)
Formato dati	JSON

⚙️ Installazione
Richiede un ambiente web con PHP 7.4+ e l’estensione php_curl attiva (XAMPP, MAMP, WAMP o Apache/Nginx su Linux).

Clona il repository

git clone https://github.com/Alexinfotech/MadreNatura/edit/main/README.md
cd NOME_REPOSITORY
Configura il server

Verifica che PHP interpreti i file .php.

Assicurati che php_curl sia abilitato nel php.ini.

Posiziona la cartella madreNatura/ nella Document Root (es. htdocs/, www/).

Accedi dal browser


http://localhost/madreNatura/
Le librerie frontend arrivano via CDN: non servono npm o yarn per il funzionamento base.

🕹️ Utilizzo
Modulo	Come si usa
Dashboard	Mostra tutte le card principali.
Meteo regionale	Clicca una regione ⇒ card città con meteo attuale; clicca la card ⇒ previsione 3 gg. “Mostra tutta Italia” ripristina la vista.
Previsioni	Inserisci città o usa <i class="fas fa-map-marker-alt"></i>; scegli 7 gg (grafici orari) o 14 gg (overview).
Radiazione & UV	Ricerca o geolocalizzazione ⇒ seleziona Oggi, 7 o 16 gg per grafici dinamici.

📄 Licenza
Questo progetto è rilasciato sotto GNU General Public License v3-or-later.
Se redistribuisci o modifichi anche solo parti del codice, devi mantenere la stessa licenza copyleft.
Il testo completo è nel file LICENSE.

📧 Contatti
Domande o collaborazioni → alessandro.tornabene78@gmail.com

© 2024 Alessandro Tornabene – rilasciato come software libero.

## `LICENSE`  (GNU General Public License v3.0 )

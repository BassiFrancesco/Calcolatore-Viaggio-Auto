/* =========================================================================
   VEHICLE-DATABASE.JS
   =========================================================================
   Database locale di riferimento per l'autocompilazione dei dati tecnici.
   Il costo/km ufficiale ACI 2026 è in "Aci 2026 database.js", caricato
   subito dopo questo file dalla pagina principale.

   IMPORTANTE - DA LEGGERE:
   Questo NON è l'archivio ufficiale ACI completo: contiene solo il
   complemento tecnico per i modelli più diffusi sul mercato italiano, con
   valori tecnici indicativi (cilindrata, potenza, consumo medio) tratti
   da schede tecniche pubbliche dei costruttori. Servono come PUNTO DI
   PARTENZA: verifica sempre libretto/carta di circolazione del tuo
   veicolo specifico e correggi i valori se necessario.

   COME AGGIUNGERE UN MODELLO:
   Aggiungi un oggetto all'array VEHICLE_DB seguendo lo stesso schema:
   {
     name: "Nome esatto che vuoi vedere/cercare",
     type: "auto" oppure "camion",
     fuel: "benzina" | "diesel" | "gpl" | "metano" | "elettrico",
     disp: "cilindrata come testo, es. 1.2L",
     hp:   potenza in CV (numero),
     cons: consumo medio combinato in l/100km (o kWh/100km se elettrico,
           o kg/100km se metano)
   }
   ========================================================================= */

const VEHICLE_DB = [
  // ---- Auto a benzina / mild-hybrid più diffuse ----
  { name: "Fiat Panda / Pandina", type: "auto", fuel: "benzina", disp: "1.0L mild hybrid", hp: 70, cons: 5.2 },
  { name: "Fiat Grande Panda", type: "auto", fuel: "benzina", disp: "1.2L turbo", hp: 101, cons: 5.5 },
  { name: "Fiat Grande Panda Hybrid", type: "auto", fuel: "benzina", disp: "1.2L hybrid", hp: 110, cons: 4.8 },
  { name: "Fiat Tipo", type: "auto", fuel: "benzina", disp: "1.5L hybrid", hp: 130, cons: 5.9 },
  { name: "Dacia Sandero", type: "auto", fuel: "benzina", disp: "1.0L turbo", hp: 90, cons: 5.6 },
  { name: "Dacia Duster", type: "auto", fuel: "benzina", disp: "1.2L turbo", hp: 130, cons: 6.5 },
  { name: "Citroen C3", type: "auto", fuel: "benzina", disp: "1.2L turbo", hp: 100, cons: 5.7 },
  { name: "Jeep Avenger", type: "auto", fuel: "benzina", disp: "1.2L turbo", hp: 100, cons: 5.9 },
  { name: "Kia Sportage Hybrid", type: "auto", fuel: "benzina", disp: "1.6L hybrid", hp: 150, cons: 6.0 },
  { name: "Toyota Yaris Hybrid", type: "auto", fuel: "benzina", disp: "1.5L hybrid", hp: 116, cons: 4.2 },
  { name: "Toyota Yaris Cross Hybrid", type: "auto", fuel: "benzina", disp: "1.5L hybrid", hp: 116, cons: 4.5 },
  { name: "Toyota Aygo X", type: "auto", fuel: "benzina", disp: "1.0L", hp: 72, cons: 5.0 },
  { name: "Renault Clio", type: "auto", fuel: "benzina", disp: "1.0L turbo", hp: 90, cons: 5.3 },
  { name: "Renault Clio Hybrid", type: "auto", fuel: "benzina", disp: "1.6L hybrid", hp: 145, cons: 4.3 },
  { name: "Volkswagen T-Cross", type: "auto", fuel: "benzina", disp: "1.0L TSI", hp: 95, cons: 5.8 },
  { name: "Volkswagen Golf", type: "auto", fuel: "benzina", disp: "1.5L TSI", hp: 130, cons: 6.0 },
  { name: "Opel Corsa", type: "auto", fuel: "benzina", disp: "1.2L turbo", hp: 100, cons: 5.6 },

  // ---- Auto diesel ----
  { name: "Volkswagen Golf Diesel", type: "auto", fuel: "diesel", disp: "2.0L TDI", hp: 116, cons: 4.6 },
  { name: "Peugeot 3008 Diesel", type: "auto", fuel: "diesel", disp: "1.5L BlueHDi", hp: 130, cons: 5.2 },
  { name: "BMW Serie 3 Diesel", type: "auto", fuel: "diesel", disp: "2.0L", hp: 190, cons: 5.5 },

  // ---- Auto elettriche ----
  { name: "Fiat 500e", type: "auto", fuel: "elettrico", disp: "—", hp: 118, cons: 13.0 },
  { name: "Dacia Spring", type: "auto", fuel: "elettrico", disp: "—", hp: 65, cons: 12.4 },
  { name: "Leapmotor T03", type: "auto", fuel: "elettrico", disp: "—", hp: 95, cons: 13.5 },
  { name: "Tesla Model 3", type: "auto", fuel: "elettrico", disp: "—", hp: 283, cons: 14.5 },
  { name: "Tesla Model Y", type: "auto", fuel: "elettrico", disp: "—", hp: 299, cons: 15.5 },
  { name: "BYD Seal U", type: "auto", fuel: "elettrico", disp: "—", hp: 218, cons: 16.0 },
  { name: "Mercedes CLA 250+ EQ", type: "auto", fuel: "elettrico", disp: "—", hp: 272, cons: 12.2 },

  // ---- GPL / Metano ----
  { name: "Fiat Panda GPL", type: "auto", fuel: "gpl", disp: "1.0L GPL", hp: 70, cons: 7.5 },
  { name: "Fiat Panda Metano", type: "auto", fuel: "metano", disp: "1.0L CNG", hp: 70, cons: 4.2 },

  // ---- Furgoni e camion ----
  { name: "Fiat Ducato (furgone)", type: "camion", fuel: "diesel", disp: "2.2L Multijet", hp: 140, cons: 9.0 },
  { name: "Iveco Daily", type: "camion", fuel: "diesel", disp: "3.0L", hp: 156, cons: 11.0 },
  { name: "Iveco Eurocargo (medio)", type: "camion", fuel: "diesel", disp: "5.9L", hp: 220, cons: 22.0 },
  { name: "MAN TGX (pesante)", type: "camion", fuel: "diesel", disp: "12.4L", hp: 460, cons: 32.0 },
  { name: "Scania R450 (pesante)", type: "camion", fuel: "diesel", disp: "12.7L", hp: 450, cons: 31.0 },
  { name: "Volvo FH (pesante)", type: "camion", fuel: "diesel", disp: "12.8L", hp: 460, cons: 30.0 },
];

/* Categorie generiche di fallback, usate quando non trovi il tuo modello
   esatto nell'elenco sopra. Restano sempre modificabili a mano. */
const AUTO_CATEGORIES = [
  { id: "utilitaria_benzina", label: "Utilitaria benzina (categoria generica)", fuel: "benzina", disp: "1.0-1.2L", hp: 75, cons: 5.8 },
  { id: "utilitaria_diesel", label: "Utilitaria diesel (categoria generica)", fuel: "diesel", disp: "1.3L", hp: 95, cons: 4.3 },
  { id: "berlina_benzina", label: "Berlina/media benzina (categoria generica)", fuel: "benzina", disp: "1.5L", hp: 130, cons: 6.8 },
  { id: "berlina_diesel", label: "Berlina/media diesel (categoria generica)", fuel: "diesel", disp: "1.6L", hp: 120, cons: 5.2 },
  { id: "suv_benzina", label: "SUV benzina (categoria generica)", fuel: "benzina", disp: "1.5-2.0L", hp: 170, cons: 7.8 },
  { id: "suv_diesel", label: "SUV diesel (categoria generica)", fuel: "diesel", disp: "2.0L", hp: 150, cons: 6.2 },
  { id: "ibrida", label: "Ibrida benzina (categoria generica)", fuel: "benzina", disp: "1.6-1.8L + elettrico", hp: 122, cons: 4.6 },
  { id: "elettrica", label: "Elettrica (categoria generica)", fuel: "elettrico", disp: "—", hp: 150, cons: 16.5 },
];
const CAMION_CATEGORIES = [
  { id: "furgone_leggero", label: "Furgone leggero <3,5t (categoria generica)", fuel: "diesel", disp: "2.0-2.3L", hp: 140, cons: 9.5 },
  { id: "camion_medio", label: "Camion medio 3,5-7,5t (categoria generica)", fuel: "diesel", disp: "3.0L", hp: 180, cons: 15 },
  { id: "camion_pesante", label: "Camion pesante 7,5-26t (categoria generica)", fuel: "diesel", disp: "6-8L", hp: 300, cons: 28 },
  { id: "bilico", label: "Autoarticolato/bilico >26t (categoria generica)", fuel: "diesel", disp: "10-13L", hp: 450, cons: 33 },
];

/* Prezzi medi carburante di riferimento (aggiornabili a mano nel tool).
   Fonte: media ufficiale MIMIT - Osservatorio Prezzi Carburanti, rilevati
   il 17/09/2026. Il tool salva in automatico l'ultimo prezzo che inserisci
   e lo userà come nuovo valore predefinito ad ogni apertura. */
const FUEL_DEFAULTS = { benzina: 2.143, diesel: 2.266, gpl: 0.748, metano: 1.844, elettrico: 0.28 };
const FUEL_DEFAULTS_DATE = "17/09/2026 (media MIMIT - Osservatorio Prezzi Carburanti)";
const FUEL_LABEL_UNIT = { benzina: "litro", diesel: "litro", gpl: "litro", metano: "kg", elettrico: "kWh" };

// Alias esplicito: l'archivio qui sopra contiene i dati tecnici locali;
// l'archivio ACI 2026 viene caricato separatamente per il costo al km.
const TECHNICAL_VEHICLE_DB = VEHICLE_DB;

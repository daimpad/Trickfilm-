// ERZEUGT von tools/figuren-erzeugen.js aus figuren/rig-spezifikation.json: normative Maße der Rigs. Nicht von Hand ändern.
export const SPEZ = {
  "fassung": 1,
  "status": "Entwurf bis zur Freigabe von Phase 3, danach eingefroren",
  "einheit": "px auf der Bühne 1920 x 1080 bei massstab 1",
  "koordinaten": "Ursprung im Hüftgelenk; x zeigt in Blickrichtung, y nach unten; Winkel in Grad, vorwärts positiv, 0 = Glied hängt senkrecht, Rumpf und Kopf 0 = aufrecht",
  "kontur": {
    "haupt": 8,
    "teil": 6,
    "detail": 4
  },
  "gelenk_ueberlappung": 14,
  "boden_y": 760,
  "tisch_y": 560,
  "doppelschritt_px": 140,
  "handformen": [
    "offen",
    "greifend",
    "zeigend"
  ],
  "farbschluessel": {
    "#ff00ff": "kleidung1",
    "#ffff00": "kleidung2",
    "#00ff00": "zubehoer"
  },
  "archetypen": {
    "sitzend-profil": {
      "ansicht": "profil",
      "massstab": 1,
      "huefte_y": 620,
      "beine": "statisch",
      "segmente": {
        "rumpf": 130,
        "oberarm": 90,
        "unterarm": 90,
        "oberschenkel": 102,
        "unterschenkel": 98,
        "knoechel": 10
      },
      "gelenke": {
        "schulter": [
          2,
          -122
        ],
        "nacken": [
          0,
          -136
        ],
        "huefteF": [
          0,
          0
        ],
        "huefteB": [
          -4,
          0
        ]
      },
      "fussziel": {
        "legF": [
          100,
          130
        ],
        "legB": [
          72,
          130
        ]
      },
      "ebenen": [
        "legB",
        "armB",
        "torso",
        "head",
        "legF",
        "armF"
      ]
    },
    "stehend-profil": {
      "ansicht": "profil",
      "massstab": 1,
      "huefte_ueber_boden": 210,
      "beine": "gang",
      "segmente": {
        "rumpf": 130,
        "oberarm": 90,
        "unterarm": 90,
        "oberschenkel": 102,
        "unterschenkel": 98,
        "knoechel": 10
      },
      "gelenke": {
        "schulter": [
          2,
          -122
        ],
        "nacken": [
          0,
          -136
        ],
        "huefteF": [
          0,
          0
        ],
        "huefteB": [
          -4,
          0
        ]
      },
      "ebenen": [
        "armB",
        "legB",
        "torso",
        "head",
        "legF",
        "armF"
      ]
    },
    "stehend-frontal": {
      "ansicht": "frontal",
      "massstab": 1,
      "huefte_ueber_boden": 210,
      "beine": "statisch",
      "segmente": {
        "rumpf": 130,
        "oberarm": 90,
        "unterarm": 90,
        "oberschenkel": 102,
        "unterschenkel": 98,
        "knoechel": 10
      },
      "gelenke": {
        "schulterL": [
          -44,
          -122
        ],
        "schulterR": [
          44,
          -122
        ],
        "nacken": [
          0,
          -136
        ],
        "huefteL": [
          -18,
          0
        ],
        "huefteR": [
          18,
          0
        ]
      },
      "ebenen": [
        "legL",
        "legR",
        "torso",
        "head",
        "armL",
        "armR"
      ]
    },
    "oberkoerper-nah": {
      "ansicht": "profil",
      "massstab": 1.8,
      "beine": "keine",
      "segmente": {
        "rumpf": 130,
        "oberarm": 90,
        "unterarm": 90
      },
      "gelenke": {
        "schulter": [
          2,
          -122
        ],
        "nacken": [
          0,
          -136
        ]
      },
      "ebenen": [
        "armB",
        "torso",
        "head",
        "armF"
      ]
    }
  },
  "teile": {
    "profil": [
      "torso",
      "head",
      "armF-upper",
      "armF-lower",
      "armF-hand",
      "armB-upper",
      "armB-lower",
      "armB-hand",
      "legF-upper",
      "legF-lower",
      "legF-foot",
      "legB-upper",
      "legB-lower",
      "legB-foot"
    ],
    "frontal": [
      "torso",
      "head",
      "armL-upper",
      "armL-lower",
      "armL-hand",
      "armR-upper",
      "armR-lower",
      "armR-hand",
      "legL-upper",
      "legL-lower",
      "legL-foot",
      "legR-upper",
      "legR-lower",
      "legR-foot"
    ]
  }
};

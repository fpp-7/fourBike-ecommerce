// Public catalog data. Technical values require supplier confirmation.
const catalog = [
  {
    "id": "x18",
    "name": "X18",
    "character": "Praticidade com personalidade",
    "description": "Farol redondo, painel digital e bateria removível. Conheça os detalhes do X18 e veja o modelo de perto na loja.",
    "motor": "1.000 W",
    "range": "Até 50 km",
    "charge": "6 a 8 horas",
    "capacity": "Até 200 kg",
    "battery": "Lítio removível",
    "features": [
      "Chave e NFC",
      "Farol em LED",
      "Suporte para sacola"
    ],
    "originalPhotoCount": 5
  },
  {
    "id": "x13",
    "name": "X13",
    "character": "Detalhes para o dia a dia",
    "description": "Um modelo com suporte para celular, compartimento sob o banco e função de ré para facilitar as manobras.",
    "motor": "1.000 W",
    "range": "40 a 50 km",
    "charge": "6 a 7 horas",
    "capacity": "Até 200 kg",
    "battery": "Lítio removível",
    "features": [
      "NFC",
      "Suporte para celular",
      "Ré e alarme"
    ],
    "originalPhotoCount": 7
  },
  {
    "id": "x16",
    "name": "X16",
    "character": "Recursos para acompanhar a rotina",
    "description": "O X16 reúne partida Start/Stop, compartimento sob o banco, ré e caixa de som Bluetooth.",
    "motor": "1.000 W",
    "range": "40 a 50 km",
    "charge": "6 a 7 horas",
    "capacity": "Até 200 kg",
    "battery": "Lítio removível",
    "features": [
      "Start/Stop",
      "Bluetooth",
      "Ré e alarme"
    ],
    "extra": "Espaço para duas baterias; a quantidade incluída deve ser consultada com a equipe.",
    "originalPhotoCount": 4
  },
  {
    "id": "n9",
    "name": "N9",
    "character": "Linhas urbanas e espaço para levar mais",
    "description": "Visual de scooter, baú incluso e freios a disco dianteiro e traseiro. Conheça o N9 e seus recursos.",
    "motor": "1.000 W",
    "peak": "2.000 W",
    "range": "Até 50 km",
    "charge": null,
    "capacity": null,
    "battery": "Lítio removível",
    "features": [
      "Baú incluso",
      "Bluetooth",
      "Função de ré"
    ],
    "originalPhotoCount": 4,
    "coverVersion": "3-logo-preservado"
  },
  {
    "id": "suica",
    "name": "Suíça",
    "character": "Visual robusto e baú incluso",
    "description": "O Suíça combina faróis duplos, suspensão reforçada e compartimento sob o banco, além do baú para o dia a dia.",
    "motor": "1.000 W",
    "peak": "2.000 W",
    "range": "50 a 60 km",
    "charge": "5 a 7 horas",
    "capacity": "Até 200 kg",
    "weight": "65 kg",
    "battery": "Lítio removível",
    "features": [
      "Baú incluso",
      "NFC",
      "Freios a disco"
    ],
    "originalPhotoCount": 5
  },
  {
    "id": "cappuccino",
    "name": "Cappuccino",
    "character": "O charme de um clássico",
    "description": "Linhas retrô, banco em tom claro e plataforma com estampa quadriculada. Um visual próprio para os seus trajetos.",
    "motor": "800 W",
    "range": "Até 50 km",
    "charge": null,
    "capacity": null,
    "battery": "Lítio removível, 60 V / 24 Ah",
    "features": [
      "Estilo retrô",
      "Chave e NFC",
      "Farol em LED"
    ],
    "originalPhotoCount": 5
  },
  {
    "id": "tank",
    "name": "Tank",
    "character": "Presença em cada detalhe",
    "description": "Faróis duplos, suspensão reforçada e painel digital. Conheça o Tank e converse com a equipe sobre seus recursos.",
    "motor": "1.000 W",
    "peak": "2.000 W",
    "range": "50 a 60 km",
    "charge": null,
    "capacity": "Até 200 kg",
    "battery": "Lítio removível",
    "features": [
      "NFC",
      "Bluetooth",
      "Alarme com controle"
    ],
    "originalPhotoCount": 4,
    "coverVersion": "3-logo-preservado"
  }
];

export const models = catalog.map(({ originalPhotoCount, coverVersion, ...model }) => ({
  ...model,
  photos: [
    { src:`./assets/models/${model.id}/cover.png${coverVersion ? '?v=' + coverVersion : ''}`, studio:true },
    ...Array.from({ length:originalPhotoCount }, (_,index) => ({
      src:`./assets/models/${model.id}/original-${String(index + 1).padStart(2, '0')}.jpeg`, studio:false
    }))
  ]
}));

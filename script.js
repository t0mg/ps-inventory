let counts = new Map();
let labels = new Map();

const dialog = document.querySelector("dialog");
const dialogText = document.getElementById("dialogTxt");
const cancelBtn = document.querySelector("dialog button#cancel");
const confirmBtn = document.querySelector("dialog button#ok");
const dialogInput = document.getElementById('dialogInput');
const info = document.getElementById("info");

async function showDialog(text, okBtnLabel = "OK", textInput = false) {
  dialogText.innerText = text;
  confirmBtn.innerText = okBtnLabel;
  dialogInput.style.display = textInput ? 'initial' : 'none';
  dialog.showModal();
  return new Promise((resolve) => {
    let cancelCb, confirmCb;
    cancelCb = () => {
      dialog.close();
      cancelBtn.removeEventListener("click", cancelCb);
      resolve(false);
    };
    confirmCb = () => {
      dialog.close();
      confirmBtn.removeEventListener("click", confirmCb);
      resolve(textInput ? dialogInput.value : true);
    };
    cancelBtn.addEventListener("click", cancelCb);
    confirmBtn.addEventListener("click", confirmCb);
  });
}

window.addEventListener("load", function () {
  init();
  let selectedDeviceId;
  var hints = new Map();
  // hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
  // hints.set(ZXing.DecodeHintType.ASSUME_CODE_39_CHECK_DIGIT, true);
  const formats = [ZXing.BarcodeFormat.CODE_39, ZXing.BarcodeFormat.CODE_93, ZXing.BarcodeFormat.EAN_13];
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
  const codeReader = new ZXing.BrowserMultiFormatReader(hints);
  codeReader
    .getVideoInputDevices()
    .then((videoInputDevices) => {
      const sourceSelect = document.getElementById("sourceSelect");
      selectedDeviceId = videoInputDevices[0].deviceId;
      if (videoInputDevices.length >= 1) {
        videoInputDevices.forEach((element) => {
          const sourceOption = document.createElement("option");
          sourceOption.text = element.label;
          sourceOption.value = element.deviceId;
          sourceSelect.appendChild(sourceOption);
        });

        sourceSelect.onchange = () => {
          selectedDeviceId = sourceSelect.value;
        };

        const sourceSelectPanel = document.getElementById("sourceSelectPanel");
        sourceSelectPanel.style.display = "flex";
      }

      document.getElementById("startButton").addEventListener("click", () => {
        codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          "video",
          (result, err) => {
            if (result && !document.querySelector("dialog[open]")) {
              processScan(result.text);
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
              console.error(err);
              info.textContent = err;
            }
          }
        );
        sourceSelectPanel.style.display = "none";
      });

      document.getElementById("share").addEventListener("click", () => {
        let sharetext = "";
        for (let key of counts.keys()) {
          sharetext += `${key}, ${labels.get(key).replace(',',' ')}, ${counts.get(key) || 0}\n`;
        }
        navigator.share({ text: sharetext });
      });

      document.getElementById("resetAll").addEventListener("click", () => {
        showDialog("Supprimer toutes les information en mémoire ?").then(
          (result) => {
            if (result === true) {
              counts = new Map();
              labels = new Map();
              window.localStorage.removeItem("ps_data");
              updateInfo();
            }
          }
        );
      });
    
      document.getElementById("resetCounts").addEventListener("click", () => {
        showDialog("Supprimer les comptes et garder les codes identifiés ?").then(
          (result) => {
            if (result === true) {
              counts = new Map();
              persist();
              updateInfo();
            }
          }
        );
      });
    })
    .catch((err) => {
      console.error(err);
    });
});

async function processScan(code) {
  navigator.vibrate && navigator.vibrate([100]);
  if (!labels.has(code)) {
    const label = await showDialog("Nouveau code. Entrer le nom du produit (optionnel).", undefined, true);
    labels.set(code, label || code);
  }
  const cnt = counts.get(code) || 0;
  const add  = await showDialog(`${labels.get(code)} (${cnt})`, "Ajouter 1");
  if (add === true) {
    counts.set(code, cnt + 1);
  }
  updateInfo();
  persist();
}

function updateInfo() {
  info.textContent = `Scanné: ${[...counts.values()].reduce((a,c) => a + (c || 0), 0)} produits (${labels.size} codes différents)`;
}

function persist() {
  const obj = {};
  for (let key of labels.keys()) {
    obj["" + key] = { label: labels.get(key), count: counts.get(key) };
  }
  window.localStorage.setItem("ps_data", JSON.stringify(obj));
}

function init() {
  let data = window.localStorage.getItem("ps_data") || "{}";
  try {
    const dataObj = JSON.parse(data);
    counts = new Map();
    labels = new Map();
    for (const code in dataObj) {
      counts.set(code, dataObj[code].count);
      labels.set(code, dataObj[code].label);
    }
    updateInfo();
  } catch (e) {
    window.alert("Erreur de restauration de la base de données.");
  }
}

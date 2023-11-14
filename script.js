let counts = new Map();
let labels = new Map();

const dialog = document.querySelector("dialog");
const dialogText = document.getElementById("dialogTxt");
const cancelBtn = document.querySelector("dialog button#cancel");
const confirmBtn = document.querySelector("dialog button#ok");
const info = document.getElementById("info");

async function showDialog(text, okBtnLabel = "OK") {
  dialogText.innerText = text;
  confirmBtn.innerText = okBtnLabel;
  dialog.showModal();
  return new Promise((resolve) => {
    let cancelCb, confirmCb;
    cancelCb = () => {
      console.log("cancel");
      dialog.close();
      cancelBtn.removeEventListener("click", cancelCb);
      resolve(false);
    };
    confirmCb = () => {
      console.log("ok");
      dialog.close();
      confirmBtn.removeEventListener("click", confirmCb);
      resolve(true);
    };
    cancelBtn.addEventListener("click", cancelCb);
    confirmBtn.addEventListener("click", confirmCb);
  });
}

window.addEventListener("load", function () {
  init();
  let selectedDeviceId;
  var hints = new Map();
  // hints.set(ZXing.DecodeHintType.ASSUME_GS1, true)
  hints.set(ZXing.DecodeHintType.ASSUME_CODE_39_CHECK_DIGIT, true);
  const codeReader = new ZXing.BrowserMultiFormatReader(hints);
  console.log("ZXing code reader initialized");
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
              console.log(result.getText());
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
          sharetext += `${key}, ${labels.get(key)}, ${counts.get(key)}\n`;
        }
        navigator.share({ text: sharetext });
      });

      document.getElementById("reset").addEventListener("click", () => {
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
    })
    .catch((err) => {
      console.error(err);
    });
});

function processScan(code) {
  navigator.vibrate([100]);
  if (!labels.has(code)) {
    let label = window.prompt("Entrer le nom du produit (optionnel)");
    labels.set(code, label || code);
  }
  let cnt = counts.has(code) ? counts.get(code) + 1 : 1;
  showDialog(`${labels.get(code)} (${cnt})`, "Ajouter").then(
    (result) => {
      if (result === true) {
        counts.set(code, cnt);
      }
      updateInfo();
      persist();
    }
  );
}

function updateInfo() {
  info.textContent = `Scanné: ${[...counts.values()].reduce((a,c) => a + c, 0)} produits (${labels.size} codes différents)`;
}

function persist() {
  const obj = {};
  for (let key of counts.keys()) {
    obj["" + key] = { label: labels.get(key), count: counts.get(key) };
  }
  console.log(obj);
  window.localStorage.setItem("ps_data", JSON.stringify(obj));
}

function init() {
  let data = window.localStorage.getItem("ps_data") || "{}";
  try {
    const dataObj = JSON.parse(data);
    console.log("decoded object", dataObj);
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
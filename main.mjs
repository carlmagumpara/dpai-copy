const DEEPAR_ROOT = "https://d3jgs8uysn2mr7.cloudfront.net/v5.4.3"
//const DEEPAR_ROOT = "https://d3jgs8uysn2mr7.cloudfront.net/v5.4.3"
//const DEEPAR_ROOT = "./js/3rdparty/DeepAR-Web-v5.4.3/"

import * as deepar from './js/deepar.esm.js'
import * as Beauty from "../beauty-deepar/beauty-deepar.esm.js"

const ICON_ARROW_RIGHT = "./img/icon/right-arrow.png";
const ICON_ARROW_DOWN = "./img/icon/arrow-down.png";
const ICON_RESET = "./img/icon/refresh.png";
const ICON_DISABLE_FALSE = "./img/icon/eye.png";
const ICON_DISABLE_TRUE = "./img/icon/eye_disable.png";
const ICON_IMPORT = "./img/icon/brush.png";
const ICON_EXPORT = "./img/icon/export.png";

const SKIP_DEEPAR_INIT = false;

const deeparDiv = document.querySelector("#div-deepar");
const beautyControlsDiv = document.querySelector("#div-beauty-controls");
const spinner = document.querySelector("#spinner");

const spinnerRequests = {};
let spinnerNum = 0;
let spinnerCnt = 0;

function spinnerShow(isShow) {
    spinnerCnt += isShow ? 1 : -1;
    if(spinnerCnt) {
        spinner.style.display = "block";
    } else {
        spinner.style.display = "none";
    }
}

function addSpinnerRequest(promise, delay) {
    const num = spinnerNum++;
    spinnerRequests[num] = promise;
    setTimeout(() => {
        if(!spinnerRequests[num]) {
            return;
        }
        spinnerShow(true);
        promise.then(() => {
            spinnerShow(false);
            delete spinnerRequests[num];
        }).catch(() => {
            spinnerShow(false);
            delete spinnerRequests[num];
        })
    }, delay ? delay : 100);
    promise.then(() => {
        spinnerRequests[num] = null;
    }).catch(() => {
        spinnerRequests[num] = null;
    })
}

class NamespaceIcon {
    constructor() {
        const icon = document.createElement("img")
        icon.src = ICON_ARROW_RIGHT;
        icon.className = "icon-namespace"
        this.icon = icon;
        this.active = false;
    }

    toggle() {
        this.active = !this.active;
        if(this.active) {
            this.icon.src = ICON_ARROW_DOWN;
        } else {
            this.icon.src = ICON_ARROW_RIGHT;
        }
    }

    set(active) {
        this.active = active;
        if(this.active) {
            this.icon.src = ICON_ARROW_DOWN;
        } else {
            this.icon.src = ICON_ARROW_RIGHT;
        }
    }
}

class ResetButtons {
    /**
     *
     * @param FQName {string}
     */
    constructor(FQName) {
        allResetButtons.push(this);
        this.fqName = FQName;
        const html = document.createElement("div");
        html.style.display = "flex";
        const resetIcon = document.createElement("img");
        const disableIcon = document.createElement("img");
        resetIcon.src = ICON_RESET;
        disableIcon.src = ICON_DISABLE_FALSE;
        resetIcon.className = "btn-namespace-reset"
        disableIcon.className = "btn-namespace-reset"
        resetIcon.title = "Reset";
        disableIcon.title = "Toggle visible"

        resetIcon.onclick = () => {
            this.reset();
        }
        disableIcon.onclick = () => {
            this.toggleDisable();
        }

        html.append(resetIcon);
        html.append(disableIcon);
        this.html = html;
        this.isDisabled = false;
        this.disableIcon = disableIcon;
    }

    async toggleDisable() {
        this.isDisabled = !this.isDisabled;
        if(this.isDisabled) {
            this.disableIcon.src = ICON_DISABLE_TRUE;
        } else {
            this.disableIcon.src = ICON_DISABLE_FALSE;
        }
        await beauty.runtime.setDisabled(this.fqName, this.isDisabled);
        if(this.onDisable) {
            this.onDisable(this.isDisabled);
        }
    }

    async setDisable(isDisabled) {
        if(isDisabled === this.isDisabled) {
            return;
        }
        this.isDisabled = isDisabled;
        if(this.isDisabled) {
            this.disableIcon.src = ICON_DISABLE_TRUE;
        } else {
            this.disableIcon.src = ICON_DISABLE_FALSE;
        }
        await beauty.runtime.setDisabled(this.fqName, this.isDisabled);
        if(this.onDisable) {
            this.onDisable(this.isDisabled);
        }
    }

    async reset() {
        await beauty.runtime.reset(this.fqName);
        if(this.onReset) {
            this.onReset();
        }
    }
}

class CollapsableNamespace {
    /**
     *
     * @param {string} name
     * @param {string} fqName
     */
    constructor(name, fqName) {
        this.name = name;
        this.fqName = fqName;
        this.padding = 0;
        this.childrenNamespaces = {};
        this.parameters = {};
        /**
         * @type {HTMLDivElement}
         */
        this.parameterContent = document.createElement("div");

        /**
         * @type {NamespaceIcon}
         */
        this.icon = new NamespaceIcon();

        this.html = document.createElement("div")
        this.btn = document.createElement("button")

        const parentDiv = document.createElement("div")
        parentDiv.className = "div-namespace";

        this.btn.className = "btn-namespace"
        this.btn.type = "button";
        this.btn.append(this.icon.icon);
        this.btn.append(name);
        parentDiv.append(this.btn);
        this.resetButtons = new ResetButtons(fqName);
        parentDiv.append(this.resetButtons.html);
        this.resetButtons.onReset = () => {
            this.update();
        }

        this.collapsableDiv = document.createElement("div");
        this.collapsableDiv.className = "collapse"
        if(this.parameterContent != null) {
            this.collapsableDiv.append(this.parameterContent)
        }

        let active = false;
        this.btn.onclick = () => {
            active = !active;
            if(active) {
                $(this.collapsableDiv).collapse("toggle")
                this.icon.set(active);
            } else {
                $(this.collapsableDiv).collapse("toggle")
                this.icon.set(active);
            }
        }

        this.html.append(parentDiv);
        this.html.append(this.collapsableDiv);
    }

    /**
     *
     * @param {CollapsableNamespace} namespace
     */
    addChildNamespace(namespace) {
        namespace.padding = this.padding + 1;
        namespace.setPadding(namespace.padding);
        this.childrenNamespaces[namespace.name] = namespace;
        this.collapsableDiv.append(namespace.html)
    }

    /**
     * @param {ParameterFloat | ParameterBoolean | ParameterTexture | ParameterColor} parameter
     */
    addChildParameter(parameter) {
        this.parameters[parameter.name] = parameter;
        parameter.setPadding(this.padding);
        this.collapsableDiv.append(parameter.html)
    }

    setPadding(padding) {
        this.html.style.paddingLeft = `${0.3*padding}em`;
    }

    update() {
        for(const name in this.childrenNamespaces) {
            this.childrenNamespaces[name].update()
        }
        for(const name in this.parameters) {
            this.parameters[name].update()
        }
    }
}

class ParameterFloat {
    constructor(name, defaultValue, min, max, parameter) {
        this.name = name;
        this.parameter = parameter;
        this.value = defaultValue;

        this.div = document.createElement("div");
        this.div.className = "card card-body";
        this.div.style.marginLeft = "0";
        this.div.style.borderColor = "white";

        this.label = document.createElement("label");
        this.label.className = "form-label";
        this.label.textContent = `${name}: ${defaultValue}`;
        this.label.for = `ParameterFloat-${parameter}`;

        this.input = document.createElement("input");
        this.input.type = "range";
        this.input.className = "from-range";
        this.input.min = min;
        this.input.max = max;
        this.input.value = defaultValue;
        this.input.id = `ParameterFloat-${parameter}`;
        this.input.oninput = (ev) => {
            const value = parseFloat(ev.target.value);
            addSpinnerRequest(beauty.runtime.setParameterValue(parameter, value));
            this.updateUi(value, null);
        }

        const flexDiv = document.createElement("div");
        flexDiv.style.display = "flex";
        this.resetButtons = new ResetButtons(parameter);
        flexDiv.append(this.label);
        flexDiv.append(this.resetButtons.html);

        this.resetButtons.onReset = () => {
            this.update();
        }

        this.div.append(flexDiv);
        this.div.append(this.input);

        this.html = this.div;
    }

    update() {
        this.updateUi(beauty.runtime.getParameterValue(this.parameter), null);
    }

    updateUi(value, id) {
        this.value = value;
        this.label.textContent = `${this.name}: ${this.value}`;
        this.input.value = this.value;
    }

    setPadding(padding) {
        this.div.style.marginLeft = `${0.3*padding}em`;
    }
}

function beautyToAlwanColor(color) {
    const ret = JSON.parse(JSON.stringify(color));
    if(ret.a != null) {
        ret.a /= 255;
    }
    return ret;
}

function alwanToBeautyColor(color) {
    const ret = JSON.parse(JSON.stringify(color));
    if(ret.a != null) {
        ret.a *= 255;
    }
    return ret;
}

class ParameterColor {
    constructor(name, defaultValue, templates, parameter) {
        this.name = name;
        this.parameter = parameter;
        this.value = defaultValue;
        this.templates = templates;

        this.div = document.createElement("div");
        this.div.className = "card card-body";
        this.div.style.marginLeft = "0";
        this.div.style.borderColor = "white";

        const label = document.createElement("div");
        label.style.display = "flex";
        label.textContent = name;
        this.resetButtons = new ResetButtons(parameter);
        label.append(this.resetButtons.html);
        this.resetButtons.onReset = () => {
            this.update();
        }

        this.colorDiv = document.createElement("div");
        this.colorDiv.style.borderStyle = "solid";
        this.colorDiv.style.borderWidth = "2px";
        this.colorDiv.id = `ParameterColor-${parameter}`;

        this.div.append(label);
        this.div.append(this.colorDiv);

        this.html = this.div;
    }

    setPadding(padding) {
        this.div.style.marginLeft = `${0.3*padding}em`;
    }

    initColor() {
        const defaultColor = beautyToAlwanColor(this.value);
        const templatesAlwan = [];
        for(const color of this.templates) {
            templatesAlwan.push(beautyToAlwanColor(color));
        }

        this.color = new Alwan(this.colorDiv, {
            color: defaultColor,
            default: defaultColor,
            inputs: {
                rgb: true,
                hex: true,
                hsl: true,
            },
            swatches: templatesAlwan,
        });

        this.color.on("change", (color) => {
            const value = alwanToBeautyColor(color);
            addSpinnerRequest(beauty.runtime.setParameterValue(this.parameter, value));
            this.updateUi(value, null);
        })
    }

    update() {
        this.updateUi(beauty.runtime.getParameterValue(this.parameter), null);
    }

    updateUi(value, id) {
        this.value = beautyToAlwanColor(value);
        this.color.setColor(this.value);
    }
}

class ParameterTexture {
    constructor(name, defaultTemplate, templates, parameter) {
        this.name = name;
        this.parameter = parameter;
        this.currentTemplate = defaultTemplate;
        this.templates = templates;
        this.customImageUrl = null;

        this.div = document.createElement("div");
        this.div.className = "card card-body";
        this.div.style.marginLeft = "0";
        this.div.style.borderColor = "white";

        const label = document.createElement("div");
        label.style.display = "flex";
        label.textContent = name;
        this.resetButtons2 = new ResetButtons(parameter);
        label.append(this.resetButtons2.html);
        this.resetButtons2.onReset = () => {
            this.update();
        }

        this.divGroup = document.createElement("div");
        this.divGroup.className = "btn-group btn-group-sm d-flex flex-wrap";
        this.divGroup.role = "group";

        this.buttons = {};
        for(const template of templates) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn btn-secondary";
            btn.textContent = template;
            if(template === defaultTemplate) {
                btn.className = "btn btn-primary";
            }
            this.divGroup.append(btn);
            this.buttons[template] = btn;

            btn.onclick = () => {
                addSpinnerRequest(beauty.runtime.setParameterTemplate(parameter, template));
                this.updateUi(null, template);
            }
        }

        const customButton = document.createElement("button");
        const input = document.createElement("input");
        this. input = input;
        input.type = "file";
        input.accept = "image/png, image/jpeg";
        input.style.display = "none";
        customButton.textContent = "custom";
        customButton.type = "button";
        customButton.className = "btn btn-info";
        this.divGroup.append(customButton);
        this.divGroup.append(input);
        this.buttons["_custom"] = customButton;
        customButton.onclick = () => {
            input.click();
            input.oninput = (ev) => {
                const image = input.files[0];
                const url = URL.createObjectURL(image);
                customButton.textContent = input.files[0].name;
                this.customImageUrl = url;
                addSpinnerRequest(beauty.runtime.setParameterValue(parameter, url, input.files[0].name));
                this.updateUi(url, input.files[0].name);
            }
        };

        this.div.append(label);
        this.div.append(this.divGroup);

        this.html = this.div;
    }

    update() {
        this.updateUi(beauty.runtime.getParameterValue(this.parameter), beauty.runtime.getParameterId(this.parameter));
    }

    updateUi(value, id) {
        this.currentTemplate = id;
        if(this.customImageUrl && value !== this.customImageUrl) {
            // Release the image from memory.
            URL.revokeObjectURL(this.customImageUrl);
            this.customImageUrl = null;
        }
        this.updateInternal();
    }

    updateInternal() {
        this.resetButtons();
        if(this.currentTemplate == null) {
            this.buttons["_custom"].className = "btn btn-primary";
        } else if(!(this.currentTemplate in this.buttons)) {
            this.buttons["_custom"].className = "btn btn-primary";
            this.buttons["_custom"].textContent = this.currentTemplate;
        } else {
            this.buttons[this.currentTemplate].className = "btn btn-primary";
        }
    }

    setPadding(padding) {
        this.div.style.marginLeft = `${0.3*padding}em`;
    }

    resetButtons() {
        for(const template in this.buttons) {
            this.buttons[template].className = "btn btn-secondary";
        }
        this.buttons["_custom"].className = "btn btn-info";
        this.buttons["_custom"].textContent = "custom";
        this.input.value = "";
    }
}

class ParameterBoolean {
    constructor(name, defaultValue, parameter) {
        this.name = name;
        this.parameter = parameter;
        this.value = defaultValue;

        this.div = document.createElement("div");
        this.div.className = "card card-body";
        this.div.style.marginLeft = "0";
        this.div.style.borderColor = "white";

        this.innerDiv = document.createElement("div");
        this.innerDiv.className = "form-check form-switch";

        this.label = document.createElement("label");
        this.label.className = "form-check-label";
        this.label.textContent = name;
        this.label.for = `ParameterBoolean-${parameter}`;

        this.input = document.createElement("input");
        this.input.type = "checkbox";
        this.input.className = "form-check-input";
        this.input.checked = defaultValue;
        this.input.id = `ParameterBoolean-${parameter}`;
        this.input.oninput = (ev) => {
            const value = ev.target.checked;
            addSpinnerRequest(beauty.runtime.setParameterValue(parameter, value));
            this.updateUi(value, null);
        }

        this.innerDiv.append(this.label);
        this.innerDiv.append(this.input);
        this.div.append(this.innerDiv);

        this.html = this.div;
    }

    update() {
        this.updateUi(beauty.runtime.getParameterValue(this.parameter), null);
    }

    updateUi(value, id) {
        this.input.checked = value;
    }

    setPadding(padding) {
        this.div.style.marginLeft = `${0.3*padding}em`;
    }
}

function preDownloadDeepARFiles() {
    fetch(`${DEEPAR_ROOT}/wasm/deepar.wasm`)
    fetch(`${DEEPAR_ROOT}/models/face/models-68-extreme.bin`)
    fetch(`${DEEPAR_ROOT}/mediaPipe/segmentation/models/selfie_segmenter.tflite`)
    fetch(`${DEEPAR_ROOT}/mediaPipe/segmentation/wasm/vision_wasm_internal.js`)
    fetch(`${DEEPAR_ROOT}/mediaPipe/segmentation/wasm/vision_wasm_internal.wasm`)
}

// Start downloading DeepAR files as soon as possible
//preDownloadDeepARFiles();

const topLevelNamespaces = {};

console.log(`DeepAR version: ${deepar.version}`);

const main = async function() {
    const deepAR = await deepar.initialize({
        licenseKey: "4b0df3e8c75116b990debe8dc1886a2d2f630b70dc1bdad3a6a2ac6a52eddc20197321454fb7111e",
        rootPath: DEEPAR_ROOT,
        previewElement: deeparDiv,
        additionalOptions: {
            cameraConfig: {
                disableDefaultCamera: true
            },
            //hint: ["faceModelsPredownload"],
        },
    })

    const beauty = await Beauty.initializeBeauty(deepAR, "./beauty-deepar");
    window.beauty = beauty;
    window.Template = Beauty;
    window.deepAR = deepAR;

    setupParameters(beauty);
    setupGlobalResetButtons();

    if(SKIP_DEEPAR_INIT) {
        deepAR.shutdown();
        return;
    }
    console.log("init: " + performance.now());
    await deepAR.startCamera();
    console.log("camera: " + performance.now());
}

addSpinnerRequest(main(), 500);

const colorParameters = [];
const allParameters = [];
const allResetButtons = [];
const parametersByFqName = {};

function setupParameters(beauty) {
    const parametersInfo = beauty.runtime.getParametersInfo();

    for(const info of parametersInfo) {
        const namespaces = info.name.split(".");
        let currNamespace = topLevelNamespaces;
        let currFqNamespaceName = ""
        for(let i = 0; i < namespaces.length; ++i) {
            const namespaceName = namespaces[i];

            if(i + 1 === namespaces.length) {
                let parameter;
                if(info.type === "float") {
                    parameter = new ParameterFloat(namespaceName, info.defaultValue, info.validRange.min, info.validRange.max, info.name);
                } else if(info.type === "rgba" || info.type === "rgb") {
                    const templates = [];
                    for(const template of beauty.runtime.getParameterTemplates(info.name)) {
                        templates.push(beauty.runtime.getParameterTemplateValue(info.name, template));
                    }
                    parameter = new ParameterColor(namespaceName, info.defaultValue, templates, info.name);
                    colorParameters.push(parameter);
                } else if(info.type === "texture") {
                    const defaultTemplate = beauty.runtime.getParameterId(info.name);
                    const templates = beauty.runtime.getParameterTemplates(info.name);
                    parameter = new ParameterTexture(namespaceName, defaultTemplate, templates, info.name);
                } else if(info.type === "boolean") {
                    parameter = new ParameterBoolean(namespaceName, info.defaultValue, info.name);
                } else {
                    console.error(`Unknown type: ${info.type}`);
                    console.error(info);
                    continue;
                }
                if(i === 0) {
                    currNamespace[name] = parameter;
                } else {
                    currNamespace.addChildParameter(parameter);
                }
                allParameters.push(parameter);
                parametersByFqName[info.name] = parameter;
                continue;
            }

            if(i === 0) {
                currFqNamespaceName = namespaceName;
                if(!(namespaceName in currNamespace)) {
                    currNamespace[namespaceName] = new CollapsableNamespace(namespaceName, namespaceName);
                }
                currNamespace = currNamespace[namespaceName];
            } else {
                currFqNamespaceName = `${currFqNamespaceName}.${namespaceName}`;
                if(!(namespaceName in currNamespace.childrenNamespaces)) {
                    currNamespace.addChildNamespace(new CollapsableNamespace(namespaceName, currFqNamespaceName));
                }
                currNamespace = currNamespace.childrenNamespaces[namespaceName];
            }

        }
    }

    for(const namespace in topLevelNamespaces) {
        beautyControlsDiv.append(topLevelNamespaces[namespace].html);
    }

    for(const color of colorParameters) {
        color.initColor();
    }
}

function updateAllParams(except) {
    for(const param of allParameters) {
        if(except != null && except === param.parameter) {
            continue;
        }
        param.update();
    }
}

function updateUi(changedParameters) {
    for(const fqName in changedParameters) {
        const newValue = changedParameters[fqName];
        parametersByFqName[fqName].updateUi(newValue.newValue, newValue.newId);
    }
}

class PresetListItem {
    constructor(name, path) {
        this.name = name;
        this.path = path;

        this.btn = document.createElement("button");
        this.btn.className = "list-group-item list-group-item-action";
        this.btn.textContent = name;
        this.btn.onclick = () => {
            if(this.onClick) {
                this.onClick();
            }
        }

        this.html = this.btn;
        this.isActive = false;
    }

    setActive(isActive) {
        if(isActive === this.isActive) {
            return;
        }
        this.isActive = isActive;
        if(isActive) {
            this.btn.classList.add("active");
        } else {
            this.btn.classList.remove("active");
        }
    }
}

const lookItems = [
    new PresetListItem("Cute", "./presets/looks/makeup/cute.zip"),
    new PresetListItem("Lash Delight",  "./presets/looks/makeup/lash-delight.zip"),
    new PresetListItem("Misty Enchantment",  "./presets/looks/makeup/misty-enchantment.zip"),
    new PresetListItem("Spring Petals",  "./presets/looks/makeup/spring-petals.zip"),
    new PresetListItem("Caramel Kiss",  "./presets/looks/makeup/caramel-kiss.zip"),
    new PresetListItem("Midnight Stunner",  "./presets/looks/makeup/midnight-stunner.zip"),
    new PresetListItem("Night Out",  "./presets/looks/makeup/night-out.zip"),
    new PresetListItem("Kim Classic",  "./presets/looks/makeup/kim-classic.zip"),
    new PresetListItem("Gelid Breeze",  "./presets/looks/makeup/gelid-breeze.zip"),
    new PresetListItem("Twilight Hues",  "./presets/looks/makeup/twilight-hues.zip"),
    new PresetListItem("Cateye Maple",  "./presets/looks/makeup/cateye-maple.zip"),
    new PresetListItem("Starry Night Seduction",  "./presets/looks/makeup/starry-night-seduction.zip"),
    new PresetListItem("After Dark",  "./presets/looks/makeup/after-dark.zip"),
    new PresetListItem("Happy Tears",  "./presets/looks/makeup/happy-tears.zip"),
    new PresetListItem("Skyline Glamour Stripes",  "./presets/looks/makeup/skyline-glamour-stripes.zip"),
    new PresetListItem("Black Hearts",  "./presets/looks/makeup/black-hearts.zip"),
];

const presetItems = [
  new PresetListItem("faceMakeup - Rosy", "./presets/presets/faceMakeup/rosy.zip"),
  new PresetListItem("faceMakeup - Glowing", "./presets/presets/faceMakeup/glowing.zip"),
  new PresetListItem("faceMakeup - Light Blush", "./presets/presets/faceMakeup/light-blush.zip"),
  new PresetListItem("faceMakeup - Gelid", "./presets/presets/faceMakeup/gelid.zip"),
];

const importModalCloseBtn = document.getElementById("importModalCloseBtn");
const importModalLookBtn = document.getElementById("importModalLookBtn");
const importModalPresetBtn = document.getElementById("importModalPresetBtn");
const importModalParameterPresetBtn = document.getElementById("importModalParameterPresetBtn");
const importModalDefaultImportBtn = document.getElementById("importModalDefaultImportBtn");
const importModalOverrideDropdownBtn = document.getElementById("importModalOverrideDropdownBtn");
const importModalFileInput = document.getElementById("importModalFileInput");
const exportLookBtn = document.getElementById("exportLookBtn");
const exportPresetBtn = document.getElementById("exportPresetBtn");
const exportParameterPresetBtn = document.getElementById("exportParameterPresetBtn");
const looksTabBtn = document.getElementById("looks-tab");
const presetsTabBtn = document.getElementById("presets-tab");
const fromFileTabBtn = document.getElementById("fromFile-tab");

function setupGlobalResetButtons() {
    const div = document.getElementById("div-reset-buttons");
    const beforeNode = document.getElementById("div-export-dropdown");
    const btns = new ResetButtons("");
    div.insertBefore(btns.html, beforeNode);
    btns.onReset = () => {
        for (const name in topLevelNamespaces) {
            topLevelNamespaces[name].update();
        }
    }

    // import and export buttons
    const importBtn = document.createElement("img");
    importBtn.src = ICON_IMPORT;
    importBtn.className = "btn-namespace-reset"
    importBtn.title = "Apply preset";
    div.insertBefore(importBtn, beforeNode);

    importModalCloseBtn.onclick = () => {
        $("#importModal").modal('hide');
    }

    importModalLookBtn.onclick = async () => {
        await importPreset(Beauty.ExportType.LOOK);
    }

    importModalPresetBtn.onclick = async () => {
        await importPreset(Beauty.ExportType.PRESET);
    }

    importModalParameterPresetBtn.onclick = async () => {
        await importPreset(Beauty.ExportType.PARAMETER_PRESET);
    }

    importModalDefaultImportBtn.onclick = async () => {
        await importPreset();
    }

    importModalFileInput.onchange = () => {
        selectImportedFile(importModalFileInput.files[0]);
    }

    looksTabBtn.onclick = () => {
        selectImportedFile(_selectedLookFile)
    };
    presetsTabBtn.onclick = () => {
        selectImportedFile(null)
    };
    fromFileTabBtn.onclick = () => {
        selectImportedFile(importModalFileInput.files[0])
    };

    exportLookBtn.onclick = () => {
        exportPreset(Beauty.ExportType.LOOK)
    };
    exportPresetBtn.onclick = () => {
        exportPreset(Beauty.ExportType.PRESET)
    };
    exportParameterPresetBtn.onclick = () => {
        exportPreset(Beauty.ExportType.PARAMETER_PRESET)
    };
    importBtn.onclick = () => {
        $("#importModal").modal('show');
    };

    // Add looks
    {
        const div = document.getElementById("looks-list");
        for(const item of lookItems) {
            div.append(item.html);
            item.onClick = () => {
                itemsListSetActive(lookItems, false);
                item.setActive(true);
                _selectedLookFile = item.path;
                selectImportedFile(item.path);
            }
        }
    }
    // Add presets
    {
        const div = document.getElementById("presets-list");
        for(const item of presetItems) {
            div.append(item.html);
            item.onClick = () => {
                itemsListSetActive(presetItems, false);
                item.setActive(true);
                _selectedPresetFile = item.path;
                selectImportedFile(item.path);
            }
        }
    }

    div.style.display = "flex";
}

let _selectedImportFile = null;
let _selectedLookFile = null;
let _selectedPresetFile = null;

function selectImportedFile(file) {
    _selectedImportFile = file;
    disableImportBtns(!file)
}

function disableImportBtns(isDisabled) {
    importModalOverrideDropdownBtn.disabled = isDisabled;
    importModalDefaultImportBtn.disabled = isDisabled;
}

function itemsListSetActive(itemsList, isActive) {
    for(const item of itemsList) {
        item.setActive(isActive);
    }
}

function exportPreset(type) {
    const promise = beauty.exportPreset(type);
    addSpinnerRequest(promise, 0);
    promise.then(presetZip => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(presetZip);
        link.download = 'preset.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    });
}

async function importPreset(importType) {
    if(!_selectedImportFile) {
        throw new Error("No file selected!");
    }
    disableImportBtns(true);
    $("#importModal").modal('hide');
    const promise = beauty.importPreset(_selectedImportFile, importType);
    addSpinnerRequest(promise, 500);
    const importInfo = await promise;
    disableImportBtns(!_selectedImportFile);
    updateUi(importInfo.changedParameters);
    console.log(`Import type: ${importInfo.type}`);
    // Set all params visible if importing a look.
    if(importInfo.type === Beauty.ExportType.LOOK) {
        await disableAllParameters(false);
    }
}

async function disableAllParameters(isDisabled) {
    for(const btn of allResetButtons) {
        if(btn.isDisabled !== isDisabled) {
            await btn.setDisable(isDisabled);
        }
    }
}
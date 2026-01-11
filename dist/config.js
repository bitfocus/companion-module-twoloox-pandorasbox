"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetConfigFields = GetConfigFields;
const base_1 = require("@companion-module/base");
function GetConfigFields() {
    return [
        {
            type: 'static-text',
            id: 'info',
            width: 12,
            label: 'Information',
            value: 'twoloox Pandoras Box V8 control via PandorasAutomation protocol',
        },
        {
            type: 'textinput',
            id: 'host',
            width: 6,
            label: 'Target IP',
            regex: base_1.Regex.IP,
        },
        {
            type: 'textinput',
            id: 'domain',
            width: 6,
            label: 'Domain',
            default: '0',
            regex: base_1.Regex.NUMBER,
        },
    ];
}
//# sourceMappingURL=config.js.map
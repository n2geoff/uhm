import {app} from "./src/app.js";
import {h} from "./src/tag.js";
import htm from "./src/xhtm.js";

const html = htm.bind(h);

export {app, h, html};
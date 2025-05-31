/**
 * HTML Tag Scripting Function
 *
 * Generates new DOM element(s) from a tag, attributes
 *
 * @param {String} tag                 - tag name
 * @param {Object} props               - tag attributes
 * @param {Object|String|Array} args   - text or array of child elements
 *
 * @returns {HTMLElement} The created DOM element(s)
 */
export function h(tagName, props, ...children) {
    const el = tagName === DocumentFragment ? document.createDocumentFragment() : document.createElement(tagName);
    const isScalar = (value) => typeof value === 'string' || typeof value === 'number';
    const booleanAttrs = ['disabled', 'checked', 'selected', 'hidden', 'readonly', 'required', 'open', 'autoplay', 'loop', 'muted'];

    // Handle props (object or null)
    if (props != null && typeof props === 'object' && !Array.isArray(props)) {
        for (const [key, value] of Object.entries(props)) {
            if (value == null) continue;
            if (booleanAttrs.includes(key)) {
                if (value === true) {
                    el.setAttribute(key, '');
                    el[key] = true;
                } else if (value === false) {
                    el.removeAttribute(key);
                    el[key] = false;
                }
                continue;
            }
            if (key.startsWith('on') && typeof value === 'function') {
                el.addEventListener(key.slice(2).toLowerCase(), value);
                continue;
            }
            if (key === 'class') {
                el.className = value;
                continue;
            }
            if (key === 'style' && typeof value === 'object') {
                Object.assign(el.style, value);
                continue;
            }
            el.setAttribute(key, value);
            if (key in el) {
                el[key] = value;
            }
        }
    } else if (props != null) {
        // If props is not an object, treat it as a child
        children.unshift(props);
    }

    // Handle children
    for (const child of children) {
        if (child == null) continue;
        if (isScalar(child)) {
            el.appendChild(document.createTextNode(child));
        } else if (Array.isArray(child)) {
            const fragment = document.createDocumentFragment();
            fragment.append(...child.filter(c => c != null));
            el.appendChild(fragment);
        } else if (child instanceof Node) {
            el.appendChild(child);
        } else if (typeof child === 'boolean') {
            console.warn(`Boolean child ${child} passed to h() for tag "${tagName}". Booleans are not rendered.`);
        } else {
            console.error(`Unsupported child type: ${typeof child} for tag "${tagName}" in h() function`);
        }
    }

    return el;
}

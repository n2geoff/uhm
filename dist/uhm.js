/*! Emerj v1.0.0 | MIT LICENSE | https://github.com/bryhoyt/emerj */
var diff = {
    attrs(elem) {
        const attrs = {};
        for (let i=0; i < elem.attributes.length; i++) {
            const attr = elem.attributes[i];
            attrs[attr.name] = attr.value;
        }
        return attrs;
    },
    nodesByKey(parent, makeKey) {
        const map = {};
        for (let j=0; j < parent.childNodes.length; j++) {
            const key = makeKey(parent.childNodes[j]);
            if (key) map[key] = parent.childNodes[j];
        }
        return map;
    },
    merge(base, modified, opts) {
        /* Merge any differences between base and modified back into base.
         *
         * Operates only the children nodes, and does not change the root node or its
         * attributes.
         *
         * Conceptually similar to React's reconciliation algorithm:
         * https://facebook.github.io/react/docs/reconciliation.html
         *
         * I haven't thoroughly tested performance to compare to naive DOM updates (i.e.
         * just updating the entire DOM from a string using .innerHTML), but some quick
         * tests on a basic DOMs were twice as fast -- so at least it's not slower in
         * a simple scenario -- and it's definitely "fast enough" for responsive UI and
         * even smooth animation.
         *
         * The real advantage for me is not so much performance, but that state & identity
         * of existing elements is preserved -- text typed into an <input>, an open
         * <select> dropdown, scroll position, ad-hoc attached events, canvas paint, etc,
         * are preserved as long as an element's identity remains.
         *
         * See https://korynunn.wordpress.com/2013/03/19/the-dom-isnt-slow-you-are/
         */
        opts = opts || {};
        opts.key = opts.key || (node => node.id);

        if (typeof modified === 'string') {
            const html = modified;
            // Make sure the parent element of the provided HTML is of the same type as
            // `base`'s parent. This matters when the HTML contains fragments that are
            // only valid inside certain elements, eg <td>s, which must have a <tr>
            // parent.
            modified = document.createElement(base.tagName);
            modified.innerHTML = html;
        }

        // Naively recurse into the children, if any, replacing or updating new
        // elements that are in the same position as old, deleting trailing elements
        // when the new list contains fewer children, or appending new elements if
        // it contains more children.
        //
        // For re-ordered children, the `id` attribute can be used to preserve identity.

        // Loop through .childNodes, not just .children, so we compare text nodes (and
        // comment nodes, fwiw) too.

        const nodesByKey = {old: this.nodesByKey(base, opts.key),
                          new: this.nodesByKey(modified, opts.key)};

        let idx;
        for (idx=0; modified.firstChild; idx++) {
            const newNode = modified.removeChild(modified.firstChild);
            if (idx >= base.childNodes.length) {
                // It's a new node. Append it.
                base.appendChild(newNode);
                continue;
            }

            let baseNode = base.childNodes[idx];

            // If the children are indexed, then make sure to retain their identity in
            // the new order.
            const newKey = opts.key(newNode);
            if (opts.key(baseNode) || newKey) {
                // If the new node has a key, then either use its existing match, or insert it.
                // If not, but the old node has a key, then make sure to leave it untouched and insert the new one instead.
                // Else neither node has a key. Just overwrite old with new.
                const match = (newKey && newKey in nodesByKey.old)? nodesByKey.old[newKey]: newNode;
                if (match !== baseNode) {
                    baseNode = base.insertBefore(match, baseNode);
                }
            }

            if (baseNode.nodeType !== newNode.nodeType || baseNode.tagName !== newNode.tagName) {
                // Completely different node types. Just update the whole subtree, like React does.
                base.replaceChild(newNode, baseNode);
            } else if ([Node.TEXT_NODE, Node.COMMENT_NODE].indexOf(baseNode.nodeType) >= 0) {
                // This is the terminating case of the merge() recursion.
                if (baseNode.textContent === newNode.textContent) continue;  // Don't write if we don't need to.
                baseNode.textContent = newNode.textContent;
            } else if (baseNode !== newNode) {   // Only need to update if we haven't just inserted the newNode in.
                // It's an existing node with the same tag name. Update only what's necessary.
                // First, make dicts of attributes, for fast lookup:
                const attrs = {base: this.attrs(baseNode), new: this.attrs(newNode)};
                for (const attr in attrs.base) {
                    // Remove any missing attributes.
                    if (attr in attrs.new) continue;
                    baseNode.removeAttribute(attr);
                }
                for (const attr in attrs.new) {
                    // Add and update any new or modified attributes.
                    if (attr in attrs.base && attrs.base[attr] === attrs.new[attr]) continue;
                    baseNode.setAttribute(attr, attrs.new[attr]);
                }
                // Now, recurse into the children. If the only children are text, this will
                // be the final recursion on this node.
                this.merge(baseNode, newNode);
            }
        }
        while (base.childNodes.length > idx) {
            // If base has more children than modified, delete the extras.
            base.removeChild(base.lastChild);
        }
    },
};

/*! Uhm v0.8.0 | MIT LICENSE | https://github.com/n2geoff/uhm */

/**
 * App Builder
 *
 * Composes state, actions, view together as
 * mountable ui
 *
 * @param {String}   mount          element or querySelector value
 * @param {Object}   opts           options bag of state, view, actions, and mount
 * @param {Object}   opts.state     initial app object state
 * @param {Function} opts.view      function that returns dom. state and actions are passed in
 * @param {Object}   opts.actions   object functions includes and return state
 *
 * @returns {Object}                state and update() interface
 */
function app(mount = 'body', opts = {}) {
    // initial setup
    const state   = opts.state || {};
    const view    = opts.view || (() => null);
    const actions = opts.actions || {};

    /**
     * Assigns Dispatch-able Actions into App
     *
     * @param {Object} data        state used by actions
     * @param {Object} actions     functions that update state
     */
    function dispatch(data, actions) {
        Object.entries(actions).forEach(([name, action]) => {
            if (typeof action === 'function') {
                actions[name] = (...args) => {
                    // update date from action
                    Object.assign(state, action(data, ...args));

                    // delay update
                    setTimeout(() => update(), 20);
                };
            }
        });

        update();
    }

    /** update dom */
    const update = () => {
        const parentNode = typeof mount === 'string' ? document.querySelector(mount) : mount;
        let result = view(state, actions);

        // handle multiple nodes
        if (Array.isArray(result)) {
            const fragment = document.createDocumentFragment();
            fragment.append(...result.filter(node => node != null));
            result = fragment;
        } else if (typeof result === 'string') {
            const temp = document.createElement(parentNode.tagName);
            temp.innerHTML = result;
            result = temp;
        }
        diff.merge(parentNode, result);
    };

    // mount view
    if (opts.view && mount) {
        dispatch(state, actions);
    }

    return { state, update };
}

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
function h(tagName, props, ...children) {
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

/*! xhtm v1.6.2 | MIT LICENSE | https://github.com/dy/xhtm */
const FIELD = '\ue000', QUOTES = '\ue001';

function htm (statics) {
  let h = this, prev = 0, current = [null], field = 0, args, name, value, quotes = [], quote = 0, last, level = 0, pre = false;

  const evaluate = (str, parts = [], raw) => {
    let i = 0;
    str = (!raw && str === QUOTES ?
      quotes[quote++].slice(1,-1) :
      str.replace(/\ue001/g, m => quotes[quote++]));

    if (!str) return str
    str.replace(/\ue000/g, (match, idx) => {
      if (idx) parts.push(str.slice(i, idx));
      i = idx + 1;
      return parts.push(arguments[++field])
    });
    if (i < str.length) parts.push(str.slice(i));
    return parts.length > 1 ? parts : parts[0]
  };

  // close level
  const up = () => {
    // console.log('-level', current);
    [current, last, ...args] = current;
    current.push(h(last, ...args));
    if (pre === level--) pre = false; // reset <pre>
  };

  let str = statics
    .join(FIELD)
    .replace(/<!--[^]*?-->/g, '')
    .replace(/<!\[CDATA\[[^]*\]\]>/g, '')
    .replace(/('|")[^\1]*?\1/g, match => (quotes.push(match), QUOTES));

    // ...>text<... sequence
  str.replace(/(?:^|>)((?:[^<]|<[^\w\ue000\/?!>])*)(?:$|<)/g, (match, text, idx, str) => {
    let tag, close;

    if (idx) {
      str.slice(prev, idx)
        // <abc/> → <abc />
        .replace(/(\S)\/$/, '$1 /')
        .split(/\s+/)
        .map((part, i) => {
          // </tag>, </> .../>
          if (part[0] === '/') {
            part = part.slice(1);
            // ignore duplicate empty closers </input>
            if (EMPTY[part]) return
            // ignore pairing self-closing tags
            close = tag || part || 1;
            // skip </input>
          }
          // <tag
          else if (!i) {
            tag = evaluate(part);
            // <p>abc<p>def, <tr><td>x<tr>
            if (typeof tag === 'string') { tag = tag.toLowerCase(); while (CLOSE[current[1]+tag]) up(); }
            current = [current, tag, null];
            level++;
            if (!pre && PRE[tag]) pre = level;
            // console.log('+level', tag)
            if (EMPTY[tag]) close = tag;
          }
          // attr=...
          else if (part) {
            let props = current[2] || (current[2] = {});
            if (part.slice(0, 3) === '...') {
              Object.assign(props, arguments[++field]);
            }
            else {
              [name, value] = part.split('=');
              Array.isArray(value = props[evaluate(name)] = value ? evaluate(value) : true) &&
              // if prop value is array - make sure it serializes as string without csv
              (value.toString = value.join.bind(value, ''));
            }
          }
        });
    }

    if (close) {
      if (!current[0]) err(`Wrong close tag \`${close}\``);
      up();
      // if last child is optionally closable - close it too
      while (last !== close && CLOSE[last]) up();
    }
    prev = idx + match.length;

    // fix text indentation
    if (!pre) text = text.replace(/\s*\n\s*/g,'').replace(/\s+/g, ' ');

    if (text) evaluate((last = 0, text), current, true);
  });

  if (current[0] && CLOSE[current[1]]) up();

  if (level) err(`Unclosed \`${current[1]}\`.`);

  return current.length < 3 ? current[1] : (current.shift(), current)
}

const err = (msg) => { throw SyntaxError(msg) };

// self-closing elements
const EMPTY = htm.empty = {};

// optional closing elements
const CLOSE = htm.close = {};

// preformatted text elements
const PRE = htm.pre = {};

const html = htm.bind(h);

export { app, h, html };

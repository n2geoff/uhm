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

/*! Uhm v0.6.0 | MIT LICENSE | https://github.com/n2geoff/uhm */

/**
 * App Builder
 *
 * Composes state, actions, view together as
 * mountable ui
 *
 * @param {Object}   opts           options bag of state, view, actions, and mount
 * @param {Object}   opts.state     initial app object state
 * @param {Function} opts.view      function that returns dom. state and actions are passed in
 * @param {Object}   opts.actions   object functions includes and return state
 * @param {String}   opts.mount     querySelector value
 *
 * @returns {Object}                state and update() interface
 */
function app(opts) {
    // initial setup
    const state   = check(opts.state, {});
    const view    = check(opts.view, () => null);
    const actions = check(opts.actions, {});
    const mount   = opts.mount || "body";

    /**
     * simple type validation check
     *
     * @param {*} value
     * @param {String} type
     * @returns {*}
     */
    function check(value, type) {
        return typeof value === typeof type ? value : type;
    }

    /**
     * Assigns Dispatch-able Actions into App
     *
     * @param {Object} data        state used by actions
     * @param {Object} actions     functions that update state
     */
    function dispatch(data, actions) {
        Object.entries(actions).forEach(([name, action]) => {
            if (typeof action === "function") {
                actions[name] = (...args) => {
                    // update date from action return
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
        diff.merge(document.querySelector(mount), view(state, actions));
    };

    // mount view
    if (opts.view && mount) {
        dispatch(state, actions);
    }

    return {state,update}
}

/**
 * HTML Tag Scripting Function
 *
 * Generates new DOM element(s) from a tag, attributes
 *
 * @param {String} tag                 - tag name
 * @param {Object|String|Array} args   - attributes, text or array of child elements
 *
 * @returns {HTMLElement} The created DOM element(s)
 */
function h(tag, ...args) {
    const el = document.createElement(tag);

    // support all scalar values as TextNodes
    const isScalar = (value) => ["boolean", "string", "number"].includes(typeof value);

    for(let i = 0; i < args.length; i++) {
        if (isScalar(args[i])) {
            el.appendChild(document.createTextNode(args[i]));
        } else if (Array.isArray(args[i])) {
            el.append(...args[i]);
        } else {
            for(const [k,v] of Object.entries(args[i])) {
                // if not both ways, some attributes do not render
                el.setAttribute(k, v);
                el[k] = v;
            }
        }
    }

    return el;
}

export { app, h };

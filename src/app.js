import diff from './emerj.js';

/*! Uhm v0.7.0 | MIT LICENSE | https://github.com/n2geoff/uhm */

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
export function app(opts) {
    // initial setup
    const state   = opts.state || {};
    const view    = opts.view || (() => null);
    const actions = opts.actions || {};
    const mount   = opts.mount || 'body';

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
        const parentNode = document.querySelector(mount);
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

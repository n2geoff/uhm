import diff from "./emerj.js";

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
export default function app(opts) {
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
    }

    // mount view
    if (opts.view && mount) {
        dispatch(state, actions);
    }

    return {state,update}
}

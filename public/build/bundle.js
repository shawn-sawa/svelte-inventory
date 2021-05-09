
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
(function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\module\Header.svelte generated by Svelte v3.38.2 */
    const file$4 = "src\\module\\Header.svelte";

    function create_fragment$5(ctx) {
    	let header;
    	let button0;
    	let t1;
    	let button1;
    	let t3;
    	let button2;
    	let t5;
    	let div;
    	let label;
    	let t7;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			header = element("header");
    			button0 = element("button");
    			button0.textContent = "test";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "Home";
    			t3 = space();
    			button2 = element("button");
    			button2.textContent = "New Hand Receipt";
    			t5 = space();
    			div = element("div");
    			label = element("label");
    			label.textContent = "Search:";
    			t7 = space();
    			input = element("input");
    			attr_dev(button0, "class", "svelte-ux8xih");
    			add_location(button0, file$4, 11, 2, 216);
    			attr_dev(button1, "onclick", "buildTable(property)");
    			attr_dev(button1, "class", "svelte-ux8xih");
    			add_location(button1, file$4, 12, 2, 266);
    			attr_dev(button2, "onclick", "popUp('Insert a HTML version of your Hand Receipt')");
    			attr_dev(button2, "class", "svelte-ux8xih");
    			add_location(button2, file$4, 13, 2, 322);
    			attr_dev(label, "for", "search");
    			add_location(label, file$4, 16, 4, 449);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "id", "search");
    			attr_dev(input, "name", "search");
    			add_location(input, file$4, 17, 4, 490);
    			attr_dev(div, "id", "searchBox");
    			attr_dev(div, "class", "svelte-ux8xih");
    			add_location(div, file$4, 15, 2, 423);
    			attr_dev(header, "id", "header");
    			attr_dev(header, "class", "svelte-ux8xih");
    			add_location(header, file$4, 10, 0, 192);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, button0);
    			append_dev(header, t1);
    			append_dev(header, button1);
    			append_dev(header, t3);
    			append_dev(header, button2);
    			append_dev(header, t5);
    			append_dev(header, div);
    			append_dev(div, label);
    			append_dev(div, t7);
    			append_dev(div, input);

    			if (!mounted) {
    				dispose = listen_dev(button0, "click", /*showSomething*/ ctx[0], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Header", slots, []);
    	const dispatch = createEventDispatcher();

    	const showSomething = () => {
    		dispatch(showsomething);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		showSomething
    	});

    	return [showSomething];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\module\PropertyTable.svelte generated by Svelte v3.38.2 */

    const { console: console_1$1 } = globals;
    const file$3 = "src\\module\\PropertyTable.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i].lin;
    	child_ctx[3] = list[i].mpoDesc;
    	child_ctx[5] = i;
    	return child_ctx;
    }

    // (26:0) {#each hand_receipt as {lin,mpoDesc}
    function create_each_block$1(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*i*/ ctx[5] + 1 + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*lin*/ ctx[2] + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4_value = /*mpoDesc*/ ctx[3] + "";
    	let t4;
    	let t5;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			attr_dev(td0, "class", "svelte-11pownk");
    			add_location(td0, file$3, 27, 4, 533);
    			attr_dev(td1, "class", "svelte-11pownk");
    			add_location(td1, file$3, 28, 4, 553);
    			attr_dev(td2, "class", "svelte-11pownk");
    			add_location(td2, file$3, 29, 4, 573);
    			add_location(tr, file$3, 26, 2, 523);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, t4);
    			append_dev(tr, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*hand_receipt*/ 1 && t2_value !== (t2_value = /*lin*/ ctx[2] + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*hand_receipt*/ 1 && t4_value !== (t4_value = /*mpoDesc*/ ctx[3] + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(26:0) {#each hand_receipt as {lin,mpoDesc}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let table;
    	let thead;
    	let tr;
    	let td0;
    	let t1;
    	let td1;
    	let t3;
    	let td2;
    	let t5;
    	let tbody;
    	let t6;
    	let button;
    	let mounted;
    	let dispose;
    	let each_value = /*hand_receipt*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			td0 = element("td");
    			td0.textContent = "Item Number";
    			t1 = space();
    			td1 = element("td");
    			td1.textContent = "LIN";
    			t3 = space();
    			td2 = element("td");
    			td2.textContent = "Description";
    			t5 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t6 = space();
    			button = element("button");
    			button.textContent = "delete data";
    			attr_dev(td0, "class", "svelte-11pownk");
    			add_location(td0, file$3, 17, 8, 330);
    			attr_dev(td1, "class", "svelte-11pownk");
    			add_location(td1, file$3, 18, 8, 360);
    			attr_dev(td2, "class", "svelte-11pownk");
    			add_location(td2, file$3, 19, 8, 382);
    			add_location(tr, file$3, 16, 6, 316);
    			attr_dev(thead, "class", "svelte-11pownk");
    			add_location(thead, file$3, 15, 4, 301);
    			add_location(tbody, file$3, 23, 4, 437);
    			attr_dev(table, "id", "propertyTable");
    			attr_dev(table, "class", "svelte-11pownk");
    			add_location(table, file$3, 14, 0, 269);
    			add_location(button, file$3, 36, 2, 643);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, td0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(table, t5);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			insert_dev(target, t6, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*hand_receipt*/ 1) {
    				each_value = /*hand_receipt*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("PropertyTable", slots, []);
    	let { hand_receipt } = $$props;
    	console.log(hand_receipt);
    	const writable_props = ["hand_receipt"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<PropertyTable> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		localStorage.removeItem("handReceipt");
    		window.location.reload();
    	};

    	$$self.$$set = $$props => {
    		if ("hand_receipt" in $$props) $$invalidate(0, hand_receipt = $$props.hand_receipt);
    	};

    	$$self.$capture_state = () => ({ hand_receipt });

    	$$self.$inject_state = $$props => {
    		if ("hand_receipt" in $$props) $$invalidate(0, hand_receipt = $$props.hand_receipt);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [hand_receipt, click_handler];
    }

    class PropertyTable extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { hand_receipt: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PropertyTable",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*hand_receipt*/ ctx[0] === undefined && !("hand_receipt" in props)) {
    			console_1$1.warn("<PropertyTable> was created without expected prop 'hand_receipt'");
    		}
    	}

    	get hand_receipt() {
    		throw new Error("<PropertyTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hand_receipt(value) {
    		throw new Error("<PropertyTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    async function extractData(doppedFile) {

      // TODO: add a check to make sure it was a hand receipt file dropped

      // TODO: reload page after complete
      
      cleanupFile(doppedFile);
    }

     function cleanupFile(htmlContent) {
      // * Create element to hold html in order to modify/extract it
      const htmlContainer = document.createElement("div");
      htmlContainer.innerHTML = htmlContent;

      // * Consolidate all rows into one table / rid excess
      const firstTable = htmlContainer.querySelector("table");
      const allRows = htmlContainer.querySelectorAll("tr");
      allRows.forEach((tr) => firstTable.append(tr));

      // // * Remove empty Tables and empty P
      // const allChildren =  Array.from(htmlContainer.children);
      // allChildren.forEach((el) => {
      //     if (el.tagName.toLowerCase() == 'table' || el.localName.toLowerCase() == 'table') {
      //         if (el.innerText.trim() == '') {
      //             el.remove();
      //             console.log('removed one');
      //         }
      //     }
      // });
      // console.log(htmlContainer.innerText.length);
      // console.log(htmlContainer.innerHTML.length);

      // htmlContainer.querySelectorAll('p').forEach((el) => (el.innerText.trim() == '' ? (()=>{el.remove(); console.log('removed one');})() : null));
      // console.log(htmlContainer.innerText.length);
      // console.log(htmlContainer.innerHTML.length);

      collectItemData(htmlContainer);
    }

     function collectItemData(itemContent) {
      // * Collect all valid data
      const trs = itemContent.querySelectorAll("tr");

      // * Basket holds info for the item that is being parsed
      let basket = [];

      // * Bucket holds all items after theyve been seperated.
      let bucket = [];

      trs.forEach((tr) => {
        // * If MPO in the row, means beginning of a new LIN
        if (tr.innerText.toLowerCase().includes("mpo")) {
          // * if basket isn't empty, move that stuff into the bucket
          if (basket.length != 0) {
            bucket.push(basket);
            basket = [];
          }
        }

        basket.push(tr);

        // * catches the last item and pushes it into the bucket
        // push last row to basket
        if (tr == trs[trs.length - 1]) {
          bucket.push(basket);
        }
      });

      //    console.log(bucket);
      cleanupItemData(bucket);
    }

    // function cleanupItemData(itemContent) {
    //   let hrArray = itemContent.map((item) => {
    //     // * itemArray will hold all text within the item
    //     // * still contains description rows ie. mpo / nsn
    //     let itemArray = item.map((tr) => {
    //       // * for each cell in the row if empty, get rid of it
    //       let row = Array.from(tr.cells).map((td) => {
    //         if (td.innerText.trim() != "") {
    //           return td.innerText.trim();
    //         }
    //       });

    //       if ((!row.toString().toLowerCase().includes("rank")) && row.length != 0) {
    //         return row;
    //       }
    //     });
    //     console.log(itemArray);
    //     return itemArray;
    //   });
    //   console.log(hrArray);
    //   finalStep(hrArray);
    // }

     function cleanupItemData(x) {

        let hrArray = [];
      
        x.forEach((item) => {
          let itemArray = [];
      
          item.forEach((tr) => {
            let row = [];
            let tds = Array.from(tr.cells);
      
            tds.forEach((td) => {
              let txt = td.innerText.trim();
              if (txt != '') {
                row.push(txt);
              }
            });
      
            if (!row.toString().toLowerCase().includes('rank')) {
              if (row.length != 0) {
                itemArray.push(row);
              } else {
                // * if this is not the last item, itemaray[1] wont exist because that
                // * that is the row thats currently being procssed.
                if (!itemArray[1]) {
                  itemArray[1] = [null, null];
                }
              }
            }
          });
          hrArray.push(itemArray);
        });
      
      
        let objectHolder = [];
        hrArray.forEach(endItem => {
        let obj = buildObject(endItem);
        objectHolder.push(obj);
        });
      
        console.log('DONE');
        // console.log(objectHolder)
        saveToLocalStorage(objectHolder);
      }



    function lcs(x) {
      return x.toString().toLowerCase();
    }


     function buildObject(item) {
      let itemObj = { lin: null, mpo: null, mpoDesc: null, nsn: [], nsnDetails: [] };
      let skiplist = [];
      let nsnSerialNumberHolder = {};

      for (let i = 0; i < item.length; i++) {
        //   let rowText = item[i].toString().toLowerCase();

        // * item[i] is the row
        // * item[i][?] is the cell

        // * check if the row is already processed
        if (!skiplist.includes(i)) {
          // * if row includes 'mpo'

        //   console.log(item[i], i);

          if (lcs(item[i][0]).includes("mpo")) {
            let itemNr = item[i + 1];
            itemObj.mpo = itemNr[0] ? itemNr[0] : "N/A";
            itemObj.mpoDesc = itemNr[1] ? itemNr[1].slice(itemNr[1].indexOf(" ") + 1, itemNr[1].length) : "N/A";
            itemObj.lin = itemNr[1] ? itemNr[1].slice(0, itemNr[1].indexOf(" ")) : "N/A";
            skiplist.push(i);
            skiplist.push(i + 1);
          }

          //TODO: turn mpo/nsn into elseif
          // * if row includes 'nsn'
          if (lcs(item[i]).includes("nsn")) {
            let itemNr = item[i + 1];
            nsnSerialNumberHolder = {
              nsn: itemNr[0],
              nsnDesc: itemNr[1],
              ui: itemNr[2],
              ciic: itemNr[3],
              dla: itemNr[4],
              ohQty: itemNr[5],
              serno: [],
            };

            for (let s = i + 2; s < item.length; s++) {
                // console.log(item[s]);
                // console.log(s);
                // TODO: add splitlist check in here.  Maybe?

                let serNoRowText = item[s].toString().toLowerCase();
                if (serNoRowText.includes("mpo")) {
                  break;
                } else if (serNoRowText.includes("nsn")) {
                  break;
                } else if (serNoRowText.includes("sysno")) {
                  // console.log('serian num contineu: sysno')
                  continue;
                  // * continue will break current iteration, but not the loop completly
                  // * code below this will not be executed.
                } else {
                  item[s].forEach((sn) => nsnSerialNumberHolder.serno.push(sn));
                  skiplist.push(s);
                }
     
            }

            itemObj.nsn.push(nsnSerialNumberHolder.nsn);
            itemObj.nsnDetails.push(nsnSerialNumberHolder);
            skiplist.push(i);
            skiplist.push(i + 1);
          }
        }
      }
      return itemObj;
    }


    function saveToLocalStorage(endItemData){
        if(endItemData){
            console.log('got the end item data');
            console.log(endItemData);
            localStorage.setItem('handReceipt', JSON.stringify(endItemData));
        }

    }

    /* src\module\InputHR.svelte generated by Svelte v3.38.2 */

    const { console: console_1 } = globals;
    const file$2 = "src\\module\\InputHR.svelte";

    function create_fragment$3(ctx) {
    	let div2;
    	let div0;
    	let span;
    	let t1;
    	let br;
    	let t2;
    	let input;
    	let t3;
    	let div1;
    	let t5;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			span = element("span");
    			span.textContent = "You do not have a hand receipt";
    			t1 = space();
    			br = element("br");
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			div1 = element("div");
    			div1.textContent = "drop file here";
    			t5 = space();
    			button = element("button");
    			button.textContent = "pretend drop file";
    			add_location(span, file$2, 43, 4, 976);
    			add_location(br, file$2, 44, 4, 1025);
    			attr_dev(input, "type", "file");
    			attr_dev(input, "id", "fileInput");
    			add_location(input, file$2, 45, 4, 1037);
    			add_location(div0, file$2, 42, 2, 965);
    			attr_dev(div1, "id", "fileDrop");
    			attr_dev(div1, "class", "svelte-taa5e1");
    			add_location(div1, file$2, 48, 2, 1089);
    			attr_dev(div2, "class", "container svelte-taa5e1");
    			add_location(div2, file$2, 41, 0, 938);
    			add_location(button, file$2, 53, 0, 1231);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, span);
    			append_dev(div0, t1);
    			append_dev(div0, br);
    			append_dev(div0, t2);
    			append_dev(div0, input);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div1, "dragover", prevent_default(/*divDragOver*/ ctx[0]), false, true, false),
    					listen_dev(div1, "drop", prevent_default(/*newHandReceipt*/ ctx[1]), false, true, false),
    					listen_dev(button, "click", /*click_handler*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("InputHR", slots, []);

    	const divDragOver = e => {
    		let fileDrop = e.target;

    		// let fileDrop = document.getElementById("fileDrop");
    		e.target.ondragleave = () => fileDrop.style.backgroundColor = "lightblue";

    		e.target.style.backgroundColor = "red";
    	};

    	const newHandReceipt = e => {
    		if (e.dataTransfer.getData("text")) {
    			console.log("text was dropped");
    			console.log(e.dataTransfer.getData("text"));
    		} else if (e.dataTransfer.files) {
    			console.log("file was dropped");
    			let theText = e.dataTransfer.files[0].text();

    			theText.then(x => {
    				extractData(x);
    				window.location.reload();
    			});
    		} else {
    			console.log("i dont know what was dropped");
    		}

    		e.target.style.backgroundColor = "lightblue";
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<InputHR> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		fetch("./data/apr_2021_hr.html").then(res => res.text()).then(data => extractData(data));

    		setTimeout(
    			() => {
    				window.location.reload();
    			},
    			100
    		);
    	};

    	$$self.$capture_state = () => ({ extractData, divDragOver, newHandReceipt });
    	return [divDragOver, newHandReceipt, click_handler];
    }

    class InputHR extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "InputHR",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\module\Content.svelte generated by Svelte v3.38.2 */
    const file$1 = "src\\module\\Content.svelte";

    // (20:0) {:else}
    function create_else_block(ctx) {
    	let inputhr;
    	let current;
    	inputhr = new InputHR({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(inputhr.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(inputhr, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(inputhr.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(inputhr.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(inputhr, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(20:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (15:0) {#if hand_receipt}
    function create_if_block(ctx) {
    	let t;
    	let propertytable;
    	let current;

    	propertytable = new PropertyTable({
    			props: { hand_receipt: /*hand_receipt*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			t = text("You have a hand receipt\r\n\r\n  \r\n  ");
    			create_component(propertytable.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			mount_component(propertytable, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const propertytable_changes = {};
    			if (dirty & /*hand_receipt*/ 1) propertytable_changes.hand_receipt = /*hand_receipt*/ ctx[0];
    			propertytable.$set(propertytable_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(propertytable.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(propertytable.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    			destroy_component(propertytable, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(15:0) {#if hand_receipt}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let h1;
    	let t1;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*hand_receipt*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "hi";
    			t1 = space();
    			if_block.c();
    			if_block_anchor = empty();
    			add_location(h1, file$1, 12, 0, 182);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Content", slots, []);
    	let { hand_receipt } = $$props;
    	const writable_props = ["hand_receipt"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Content> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("hand_receipt" in $$props) $$invalidate(0, hand_receipt = $$props.hand_receipt);
    	};

    	$$self.$capture_state = () => ({ PropertyTable, InputHR, hand_receipt });

    	$$self.$inject_state = $$props => {
    		if ("hand_receipt" in $$props) $$invalidate(0, hand_receipt = $$props.hand_receipt);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [hand_receipt];
    }

    class Content extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { hand_receipt: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Content",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*hand_receipt*/ ctx[0] === undefined && !("hand_receipt" in props)) {
    			console.warn("<Content> was created without expected prop 'hand_receipt'");
    		}
    	}

    	get hand_receipt() {
    		throw new Error("<Content>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hand_receipt(value) {
    		throw new Error("<Content>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\module\Rain.svelte generated by Svelte v3.38.2 */
    const file = "src\\module\\Rain.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (36:0) {#each confetti as c}
    function create_each_block(ctx) {
    	let span;
    	let t_value = /*c*/ ctx[2].character + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			set_style(span, "left", /*c*/ ctx[2].x + "%");
    			set_style(span, "top", /*c*/ ctx[2].y + "%");
    			set_style(span, "transform", "scale(" + /*c*/ ctx[2].r + ")");
    			attr_dev(span, "class", "svelte-13toh3");
    			add_location(span, file, 36, 1, 702);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*confetti*/ 1 && t_value !== (t_value = /*c*/ ctx[2].character + "")) set_data_dev(t, t_value);

    			if (dirty & /*confetti*/ 1) {
    				set_style(span, "left", /*c*/ ctx[2].x + "%");
    			}

    			if (dirty & /*confetti*/ 1) {
    				set_style(span, "top", /*c*/ ctx[2].y + "%");
    			}

    			if (dirty & /*confetti*/ 1) {
    				set_style(span, "transform", "scale(" + /*c*/ ctx[2].r + ")");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(36:0) {#each confetti as c}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let each_1_anchor;
    	let each_value = /*confetti*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*confetti*/ 1) {
    				each_value = /*confetti*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Rain", slots, []);
    	let characters = ["🥳", "poop", "🎉", "✨"];

    	let confetti = new Array(100).fill().map((_, i) => {
    		return {
    			character: characters[i % characters.length],
    			x: Math.random() * 100,
    			y: -20 - Math.random() * 100,
    			r: 0.1 + Math.random() * 1
    		};
    	}).sort((a, b) => a.r - b.r);

    	onMount(() => {
    		let frame;

    		function loop() {
    			frame = requestAnimationFrame(loop);

    			$$invalidate(0, confetti = confetti.map(emoji => {
    				emoji.y += 0.7 * emoji.r;
    				if (emoji.y > 120) emoji.y = -20;
    				return emoji;
    			}));
    		}

    		loop();
    		return () => cancelAnimationFrame(frame);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Rain> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ onMount, characters, confetti });

    	$$self.$inject_state = $$props => {
    		if ("characters" in $$props) characters = $$props.characters;
    		if ("confetti" in $$props) $$invalidate(0, confetti = $$props.confetti);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [confetti];
    }

    class Rain extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Rain",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\module\Home.svelte generated by Svelte v3.38.2 */

    function create_fragment(ctx) {
    	let header;
    	let t;
    	let content;
    	let current;
    	header = new Header({ $$inline: true });

    	content = new Content({
    			props: { hand_receipt: /*hand_receipt*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(header.$$.fragment);
    			t = space();
    			create_component(content.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(header, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(content, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const content_changes = {};
    			if (dirty & /*hand_receipt*/ 1) content_changes.hand_receipt = /*hand_receipt*/ ctx[0];
    			content.$set(content_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(content.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(content.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(content, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Home", slots, []);
    	let { hand_receipt } = $$props;
    	const writable_props = ["hand_receipt"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("hand_receipt" in $$props) $$invalidate(0, hand_receipt = $$props.hand_receipt);
    	};

    	$$self.$capture_state = () => ({ Header, Content, Rain, hand_receipt });

    	$$self.$inject_state = $$props => {
    		if ("hand_receipt" in $$props) $$invalidate(0, hand_receipt = $$props.hand_receipt);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [hand_receipt];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { hand_receipt: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*hand_receipt*/ ctx[0] === undefined && !("hand_receipt" in props)) {
    			console.warn("<Home> was created without expected prop 'hand_receipt'");
    		}
    	}

    	get hand_receipt() {
    		throw new Error("<Home>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hand_receipt(value) {
    		throw new Error("<Home>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const App = {

        init: function() {
            console.log('=> App.init()');

            // Initialize Application User
            // App.User = {};

            // Initialize Application State
            App.State = {
                hasHandReceipt: localStorage['handReceipt'] ? JSON.parse(localStorage['handReceipt']) : false,
            };

            // Initialize Application Globals/Constants
            // App['TIMEOUT'] = 1000 * 60 * 30;

            //? check if HR exist in storage
            //? assume they do not 

            App.load();
        },

        load: function() {
            console.log('=> App.load()');



            const config = {
                target: document.body,
                props: {
                    hand_receipt : App.State.hasHandReceipt,
                }
            };




            App.render(config).exec();
        },

        exec: function() {
            console.log('=> App.exec()');

            // Global Event Handlers go here...
        },

        render: function(content) {
            App.Home = new Home(content);

            return this;
        },

    };

    window.onload = () => {
        App.init();
    };

}());
//# sourceMappingURL=bundle.js.map

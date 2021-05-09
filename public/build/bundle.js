
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
    const file$5 = "src\\module\\Header.svelte";

    function create_fragment$6(ctx) {
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
    			add_location(button0, file$5, 11, 2, 216);
    			attr_dev(button1, "onclick", "buildTable(property)");
    			attr_dev(button1, "class", "svelte-ux8xih");
    			add_location(button1, file$5, 12, 2, 266);
    			attr_dev(button2, "onclick", "popUp('Insert a HTML version of your Hand Receipt')");
    			attr_dev(button2, "class", "svelte-ux8xih");
    			add_location(button2, file$5, 13, 2, 322);
    			attr_dev(label, "for", "search");
    			add_location(label, file$5, 16, 4, 449);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "id", "search");
    			attr_dev(input, "name", "search");
    			add_location(input, file$5, 17, 4, 490);
    			attr_dev(div, "id", "searchBox");
    			attr_dev(div, "class", "svelte-ux8xih");
    			add_location(div, file$5, 15, 2, 423);
    			attr_dev(header, "id", "header");
    			attr_dev(header, "class", "svelte-ux8xih");
    			add_location(header, file$5, 10, 0, 192);
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
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\module\Components\PropertyTable.svelte generated by Svelte v3.38.2 */

    const { console: console_1$1 } = globals;
    const file$4 = "src\\module\\Components\\PropertyTable.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i].lin;
    	child_ctx[3] = list[i].mpoDesc;
    	child_ctx[5] = i;
    	return child_ctx;
    }

    // (18:4) {#each hand_receipt as { lin, mpoDesc }
    function create_each_block$2(ctx) {
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
    			attr_dev(td0, "class", "svelte-8arh9k");
    			add_location(td0, file$4, 19, 8, 351);
    			attr_dev(td1, "class", "svelte-8arh9k");
    			add_location(td1, file$4, 20, 8, 377);
    			attr_dev(td2, "class", "svelte-8arh9k");
    			add_location(td2, file$4, 21, 8, 401);
    			add_location(tr, file$4, 18, 6, 337);
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
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(18:4) {#each hand_receipt as { lin, mpoDesc }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
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
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
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
    			attr_dev(td0, "class", "svelte-8arh9k");
    			add_location(td0, file$4, 9, 6, 138);
    			attr_dev(td1, "class", "svelte-8arh9k");
    			add_location(td1, file$4, 10, 6, 166);
    			attr_dev(td2, "class", "svelte-8arh9k");
    			add_location(td2, file$4, 11, 6, 186);
    			add_location(tr, file$4, 8, 4, 126);
    			attr_dev(thead, "class", "svelte-8arh9k");
    			add_location(thead, file$4, 7, 2, 113);
    			add_location(tbody, file$4, 15, 2, 235);
    			attr_dev(table, "id", "propertyTable");
    			attr_dev(table, "class", "svelte-8arh9k");
    			add_location(table, file$4, 6, 0, 83);
    			add_location(button, file$4, 27, 0, 471);
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
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
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
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { hand_receipt: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PropertyTable",
    			options,
    			id: create_fragment$5.name
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

    /* src\module\Components\InputHR.svelte generated by Svelte v3.38.2 */

    const { console: console_1 } = globals;
    const file$3 = "src\\module\\Components\\InputHR.svelte";

    function create_fragment$4(ctx) {
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
    			add_location(span, file$3, 43, 4, 979);
    			add_location(br, file$3, 44, 4, 1028);
    			attr_dev(input, "type", "file");
    			attr_dev(input, "id", "fileInput");
    			add_location(input, file$3, 45, 4, 1040);
    			add_location(div0, file$3, 42, 2, 968);
    			attr_dev(div1, "id", "fileDrop");
    			attr_dev(div1, "class", "svelte-taa5e1");
    			add_location(div1, file$3, 48, 2, 1092);
    			attr_dev(div2, "class", "container svelte-taa5e1");
    			add_location(div2, file$3, 41, 0, 941);
    			add_location(button, file$3, 53, 0, 1234);
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
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "InputHR",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\module\Components\ItemView.svelte generated by Svelte v3.38.2 */

    const file$2 = "src\\module\\Components\\ItemView.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (158:14) {#each nsn.serno as serno}
    function create_each_block_1(ctx) {
    	let li;
    	let t_value = /*serno*/ ctx[6] + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			add_location(li, file$2, 159, 18, 3627);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(158:14) {#each nsn.serno as serno}",
    		ctx
    	});

    	return block;
    }

    // (108:0) {#each nsns as nsn}
    function create_each_block$1(ctx) {
    	let table;
    	let thead;
    	let tr0;
    	let td0;
    	let t0_value = /*nsn*/ ctx[3].nsnDesc + "";
    	let t0;
    	let t1;
    	let tbody;
    	let tr1;
    	let td1;
    	let t3;
    	let td2;
    	let t4_value = /*nsn*/ ctx[3].nsn + "";
    	let t4;
    	let t5;
    	let tr2;
    	let td3;
    	let t7;
    	let td4;
    	let t8_value = /*nsn*/ ctx[3].nsnDesc + "";
    	let t8;
    	let t9;
    	let tr3;
    	let td5;
    	let t11;
    	let td6;
    	let t13;
    	let tr4;
    	let td7;
    	let t15;
    	let td8;
    	let t17;
    	let tr5;
    	let td9;
    	let t18;
    	let tr6;
    	let td10;
    	let b0;
    	let t20;
    	let td11;
    	let b1;
    	let t22;
    	let td12;
    	let b2;
    	let t24;
    	let td13;
    	let b3;
    	let t26;
    	let tr7;
    	let td14;
    	let t27_value = /*nsn*/ ctx[3].ui + "";
    	let t27;
    	let t28;
    	let td15;
    	let t29_value = /*nsn*/ ctx[3].ciic + "";
    	let t29;
    	let t30;
    	let td16;
    	let t31_value = /*nsn*/ ctx[3].dla + "";
    	let t31;
    	let t32;
    	let td17;
    	let t33_value = /*nsn*/ ctx[3].ohQty + "";
    	let t33;
    	let t34;
    	let tr8;
    	let td18;
    	let t35;
    	let tr9;
    	let td19;
    	let t37;
    	let td20;
    	let ul;
    	let t38;
    	let tr10;
    	let td21;
    	let t40;
    	let each_value_1 = /*nsn*/ ctx[3].serno;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td1 = element("td");
    			td1.textContent = "NSN";
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			tr2 = element("tr");
    			td3 = element("td");
    			td3.textContent = "NSN Description";
    			t7 = space();
    			td4 = element("td");
    			t8 = text(t8_value);
    			t9 = space();
    			tr3 = element("tr");
    			td5 = element("td");
    			td5.textContent = "TM";
    			t11 = space();
    			td6 = element("td");
    			td6.textContent = "TM 12-1345-134";
    			t13 = space();
    			tr4 = element("tr");
    			td7 = element("td");
    			td7.textContent = "BOM";
    			t15 = space();
    			td8 = element("td");
    			td8.textContent = "CLICK ME";
    			t17 = space();
    			tr5 = element("tr");
    			td9 = element("td");
    			t18 = space();
    			tr6 = element("tr");
    			td10 = element("td");
    			b0 = element("b");
    			b0.textContent = "ui";
    			t20 = space();
    			td11 = element("td");
    			b1 = element("b");
    			b1.textContent = "ciic";
    			t22 = space();
    			td12 = element("td");
    			b2 = element("b");
    			b2.textContent = "dla";
    			t24 = space();
    			td13 = element("td");
    			b3 = element("b");
    			b3.textContent = "ohQty";
    			t26 = space();
    			tr7 = element("tr");
    			td14 = element("td");
    			t27 = text(t27_value);
    			t28 = space();
    			td15 = element("td");
    			t29 = text(t29_value);
    			t30 = space();
    			td16 = element("td");
    			t31 = text(t31_value);
    			t32 = space();
    			td17 = element("td");
    			t33 = text(t33_value);
    			t34 = space();
    			tr8 = element("tr");
    			td18 = element("td");
    			t35 = space();
    			tr9 = element("tr");
    			td19 = element("td");
    			td19.textContent = "Serial Numbers";
    			t37 = space();
    			td20 = element("td");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t38 = space();
    			tr10 = element("tr");
    			td21 = element("td");
    			td21.textContent = "View COEI!";
    			t40 = space();
    			attr_dev(td0, "colspan", "4");
    			add_location(td0, file$2, 111, 10, 2197);
    			add_location(tr0, file$2, 110, 8, 2181);
    			add_location(thead, file$2, 109, 4, 2164);
    			add_location(td1, file$2, 116, 10, 2303);
    			attr_dev(td2, "id", "nsn");
    			attr_dev(td2, "colspan", "3");
    			add_location(td2, file$2, 117, 10, 2327);
    			add_location(tr1, file$2, 115, 8, 2287);
    			add_location(td3, file$2, 120, 10, 2407);
    			attr_dev(td4, "id", "nsnDesc");
    			attr_dev(td4, "colspan", "3");
    			add_location(td4, file$2, 121, 10, 2443);
    			add_location(tr2, file$2, 119, 8, 2391);
    			add_location(td5, file$2, 124, 10, 2531);
    			attr_dev(td6, "id", "nsnDesc");
    			attr_dev(td6, "colspan", "3");
    			add_location(td6, file$2, 125, 10, 2554);
    			add_location(tr3, file$2, 123, 8, 2515);
    			add_location(td7, file$2, 128, 10, 2643);
    			attr_dev(td8, "id", "nsnDesc");
    			attr_dev(td8, "colspan", "3");
    			add_location(td8, file$2, 129, 10, 2667);
    			add_location(tr4, file$2, 127, 8, 2627);
    			set_style(td9, "background-color", "black");
    			attr_dev(td9, "colspan", "4");
    			add_location(td9, file$2, 132, 10, 2750);
    			add_location(tr5, file$2, 131, 8, 2734);
    			add_location(b0, file$2, 135, 32, 2868);
    			set_style(td10, "width", "25%");
    			add_location(td10, file$2, 135, 10, 2846);
    			add_location(b1, file$2, 136, 32, 2916);
    			set_style(td11, "width", "25%");
    			add_location(td11, file$2, 136, 10, 2894);
    			add_location(b2, file$2, 137, 32, 2966);
    			set_style(td12, "width", "25%");
    			add_location(td12, file$2, 137, 10, 2944);
    			add_location(b3, file$2, 138, 32, 3015);
    			set_style(td13, "width", "25%");
    			add_location(td13, file$2, 138, 10, 2993);
    			add_location(tr6, file$2, 134, 8, 2830);
    			attr_dev(td14, "id", "ui");
    			add_location(td14, file$2, 142, 10, 3081);
    			attr_dev(td15, "id", "ciic");
    			add_location(td15, file$2, 143, 10, 3118);
    			attr_dev(td16, "id", "dla");
    			add_location(td16, file$2, 144, 10, 3159);
    			attr_dev(td17, "id", "ohQty");
    			add_location(td17, file$2, 145, 10, 3198);
    			add_location(tr7, file$2, 141, 8, 3065);
    			set_style(td18, "background-color", "black");
    			attr_dev(td18, "colspan", "4");
    			add_location(td18, file$2, 149, 10, 3278);
    			add_location(tr8, file$2, 148, 8, 3262);
    			add_location(td19, file$2, 153, 10, 3382);
    			add_location(ul, file$2, 156, 14, 3469);
    			attr_dev(td20, "id", "serno");
    			attr_dev(td20, "colspan", "3");
    			add_location(td20, file$2, 155, 10, 3425);
    			add_location(tr9, file$2, 152, 8, 3366);
    			attr_dev(td21, "colspan", "4");
    			add_location(td21, file$2, 166, 10, 3779);
    			set_style(tr10, "text-align", "center");
    			add_location(tr10, file$2, 165, 8, 3735);
    			add_location(tbody, file$2, 114, 6, 2270);
    			set_style(table, "backgroundColor", "lightblue");
    			attr_dev(table, "class", "svelte-nl50uu");
    			add_location(table, file$2, 108, 2, 2116);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, td0);
    			append_dev(td0, t0);
    			append_dev(table, t1);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td1);
    			append_dev(tr1, t3);
    			append_dev(tr1, td2);
    			append_dev(td2, t4);
    			append_dev(tbody, t5);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td3);
    			append_dev(tr2, t7);
    			append_dev(tr2, td4);
    			append_dev(td4, t8);
    			append_dev(tbody, t9);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td5);
    			append_dev(tr3, t11);
    			append_dev(tr3, td6);
    			append_dev(tbody, t13);
    			append_dev(tbody, tr4);
    			append_dev(tr4, td7);
    			append_dev(tr4, t15);
    			append_dev(tr4, td8);
    			append_dev(tbody, t17);
    			append_dev(tbody, tr5);
    			append_dev(tr5, td9);
    			append_dev(tbody, t18);
    			append_dev(tbody, tr6);
    			append_dev(tr6, td10);
    			append_dev(td10, b0);
    			append_dev(tr6, t20);
    			append_dev(tr6, td11);
    			append_dev(td11, b1);
    			append_dev(tr6, t22);
    			append_dev(tr6, td12);
    			append_dev(td12, b2);
    			append_dev(tr6, t24);
    			append_dev(tr6, td13);
    			append_dev(td13, b3);
    			append_dev(tbody, t26);
    			append_dev(tbody, tr7);
    			append_dev(tr7, td14);
    			append_dev(td14, t27);
    			append_dev(tr7, t28);
    			append_dev(tr7, td15);
    			append_dev(td15, t29);
    			append_dev(tr7, t30);
    			append_dev(tr7, td16);
    			append_dev(td16, t31);
    			append_dev(tr7, t32);
    			append_dev(tr7, td17);
    			append_dev(td17, t33);
    			append_dev(tbody, t34);
    			append_dev(tbody, tr8);
    			append_dev(tr8, td18);
    			append_dev(tbody, t35);
    			append_dev(tbody, tr9);
    			append_dev(tr9, td19);
    			append_dev(tr9, t37);
    			append_dev(tr9, td20);
    			append_dev(td20, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(tbody, t38);
    			append_dev(tbody, tr10);
    			append_dev(tr10, td21);
    			append_dev(table, t40);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*nsns*/ 2) {
    				each_value_1 = /*nsn*/ ctx[3].serno;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(108:0) {#each nsns as nsn}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let table;
    	let thead;
    	let tr0;
    	let td0;
    	let t1;
    	let tbody;
    	let tr1;
    	let td1;
    	let t3;
    	let td2;
    	let t5;
    	let tr2;
    	let td3;
    	let t7;
    	let td4;
    	let t9;
    	let tr3;
    	let td5;
    	let t11;
    	let td6;
    	let t13;
    	let tr4;
    	let td7;
    	let t15;
    	let td8;
    	let t17;
    	let each_value = /*nsns*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			td0 = element("td");
    			td0.textContent = `${/*item*/ ctx[0].mpoDesc}`;
    			t1 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td1 = element("td");
    			td1.textContent = "LIN";
    			t3 = space();
    			td2 = element("td");
    			td2.textContent = `${/*item*/ ctx[0].lin}`;
    			t5 = space();
    			tr2 = element("tr");
    			td3 = element("td");
    			td3.textContent = "MPO";
    			t7 = space();
    			td4 = element("td");
    			td4.textContent = `${/*item*/ ctx[0].mpo}`;
    			t9 = space();
    			tr3 = element("tr");
    			td5 = element("td");
    			td5.textContent = "MPO Description";
    			t11 = space();
    			td6 = element("td");
    			td6.textContent = `${/*item*/ ctx[0].mpoDesc}`;
    			t13 = space();
    			tr4 = element("tr");
    			td7 = element("td");
    			td7.textContent = "NSN(s)";
    			t15 = space();
    			td8 = element("td");
    			td8.textContent = `${/*item*/ ctx[0].nsn}`;
    			t17 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(td0, "colspan", "3");
    			add_location(td0, file$2, 84, 10, 1613);
    			add_location(tr0, file$2, 83, 8, 1597);
    			add_location(thead, file$2, 82, 4, 1580);
    			add_location(td1, file$2, 89, 10, 1732);
    			add_location(td2, file$2, 90, 10, 1756);
    			add_location(tr1, file$2, 88, 8, 1716);
    			add_location(td3, file$2, 93, 10, 1816);
    			add_location(td4, file$2, 94, 10, 1840);
    			add_location(tr2, file$2, 92, 8, 1800);
    			add_location(td5, file$2, 97, 10, 1900);
    			add_location(td6, file$2, 98, 10, 1936);
    			add_location(tr3, file$2, 96, 8, 1884);
    			add_location(td7, file$2, 101, 10, 2000);
    			add_location(td8, file$2, 102, 10, 2027);
    			add_location(tr4, file$2, 100, 8, 1984);
    			attr_dev(tbody, "id", "hrInfo");
    			add_location(tbody, file$2, 87, 6, 1687);
    			attr_dev(table, "class", "svelte-nl50uu");
    			add_location(table, file$2, 81, 2, 1567);
    			attr_dev(div, "class", "item-view svelte-nl50uu");
    			add_location(div, file$2, 80, 0, 1540);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, table);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, td0);
    			append_dev(table, t1);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td1);
    			append_dev(tr1, t3);
    			append_dev(tr1, td2);
    			append_dev(tbody, t5);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td3);
    			append_dev(tr2, t7);
    			append_dev(tr2, td4);
    			append_dev(tbody, t9);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td5);
    			append_dev(tr3, t11);
    			append_dev(tr3, td6);
    			append_dev(tbody, t13);
    			append_dev(tbody, tr4);
    			append_dev(tr4, td7);
    			append_dev(tr4, t15);
    			append_dev(tr4, td8);
    			append_dev(div, t17);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*nsns*/ 2) {
    				each_value = /*nsns*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
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
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
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
    	validate_slots("ItemView", slots, []);

    	let items = [
    		{
    			"lin": "FA20AV",
    			"mpo": "000198527",
    			"mpoDesc": "DTCS TACTICAL RADIO,A-9695-00X,EXELIS",
    			"nsn": ["582001C134201"],
    			"nsnDetails": [
    				{
    					"nsn": "582001C134201",
    					"nsnDesc": "DTCS TACTICAL RADIO,A-9695-00X,EXELIS",
    					"ui": "EA",
    					"ciic": "U",
    					"dla": "1014",
    					"ohQty": "19",
    					"serno": [
    						"969517469",
    						"969517474",
    						"969517475",
    						"969517484",
    						"969517485",
    						"969517486",
    						"969517488",
    						"969517490",
    						"969517491",
    						"969517492",
    						"969517493",
    						"969517494",
    						"969517495",
    						"969517499",
    						"01928",
    						"01957",
    						"01975",
    						"02010",
    						"02816"
    					]
    				}
    			]
    		},
    		{
    			"lin": "C89480",
    			"mpo": "000000586",
    			"mpoDesc": "CAMOUFLAGE NET SYSTEM RADAR SCATTERING:",
    			"nsn": ["1080014572956", "1080014750696"],
    			"nsnDetails": [
    				{
    					"nsn": "1080014572956",
    					"nsnDesc": "CAM SYS AN/USQ-150(V)",
    					"ui": "EA",
    					"ciic": "J",
    					"dla": "0175",
    					"ohQty": "2",
    					"serno": ["4444471", "4444474"]
    				},
    				{
    					"nsn": "1080014750696",
    					"nsnDesc": "CAM NET SY AN/USQ-159",
    					"ui": "EA",
    					"ciic": "J",
    					"dla": "0175",
    					"ohQty": "2",
    					"serno": ["1005407156", "1005407158"]
    				}
    			]
    		}
    	];

    	let item = items[1];
    	let nsns = item["nsnDetails"];
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ItemView> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ items, item, nsns });

    	$$self.$inject_state = $$props => {
    		if ("items" in $$props) items = $$props.items;
    		if ("item" in $$props) $$invalidate(0, item = $$props.item);
    		if ("nsns" in $$props) $$invalidate(1, nsns = $$props.nsns);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [item, nsns];
    }

    class ItemView extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ItemView",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\module\Content.svelte generated by Svelte v3.38.2 */
    const file$1 = "src\\module\\Content.svelte";

    function create_fragment$2(ctx) {
    	let h1;
    	let t1;
    	let itemview;
    	let current;
    	itemview = new ItemView({ $$inline: true });

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Property Tracker";
    			t1 = space();
    			create_component(itemview.$$.fragment);
    			attr_dev(h1, "class", "svelte-1bfa914");
    			add_location(h1, file$1, 8, 0, 229);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(itemview, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(itemview.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(itemview.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			destroy_component(itemview, detaching);
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

    	$$self.$capture_state = () => ({
    		PropertyTable,
    		InputHR,
    		ItemView,
    		hand_receipt
    	});

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

    /* src\module\Components\Rain.svelte generated by Svelte v3.38.2 */
    const file = "src\\module\\Components\\Rain.svelte";

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


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

    const file$3 = "src\\module\\PropertyTable.svelte";

    function create_fragment$4(ctx) {
    	let table;
    	let thead;
    	let tr0;
    	let td0;
    	let t1;
    	let td1;
    	let t3;
    	let td2;
    	let t5;
    	let tbody;
    	let tr1;
    	let td3;
    	let t7;
    	let td4;
    	let t9;
    	let td5;

    	const block = {
    		c: function create() {
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			td0 = element("td");
    			td0.textContent = "one";
    			t1 = space();
    			td1 = element("td");
    			td1.textContent = "one";
    			t3 = space();
    			td2 = element("td");
    			td2.textContent = "one";
    			t5 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td3 = element("td");
    			td3.textContent = "two";
    			t7 = space();
    			td4 = element("td");
    			td4.textContent = "two";
    			t9 = space();
    			td5 = element("td");
    			td5.textContent = "two";
    			attr_dev(td0, "class", "svelte-11pownk");
    			add_location(td0, file$3, 7, 8, 90);
    			attr_dev(td1, "class", "svelte-11pownk");
    			add_location(td1, file$3, 8, 8, 112);
    			attr_dev(td2, "class", "svelte-11pownk");
    			add_location(td2, file$3, 9, 8, 134);
    			add_location(tr0, file$3, 6, 6, 76);
    			attr_dev(thead, "class", "svelte-11pownk");
    			add_location(thead, file$3, 5, 4, 61);
    			attr_dev(td3, "class", "svelte-11pownk");
    			add_location(td3, file$3, 15, 8, 210);
    			attr_dev(td4, "class", "svelte-11pownk");
    			add_location(td4, file$3, 16, 8, 232);
    			attr_dev(td5, "class", "svelte-11pownk");
    			add_location(td5, file$3, 17, 8, 254);
    			add_location(tr1, file$3, 14, 6, 196);
    			add_location(tbody, file$3, 13, 4, 181);
    			attr_dev(table, "id", "propertyTable");
    			attr_dev(table, "class", "svelte-11pownk");
    			add_location(table, file$3, 4, 0, 29);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, td0);
    			append_dev(tr0, t1);
    			append_dev(tr0, td1);
    			append_dev(tr0, t3);
    			append_dev(tr0, td2);
    			append_dev(table, t5);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td3);
    			append_dev(tr1, t7);
    			append_dev(tr1, td4);
    			append_dev(tr1, t9);
    			append_dev(tr1, td5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
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

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("PropertyTable", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PropertyTable> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class PropertyTable extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PropertyTable",
    			options,
    			id: create_fragment$4.name
    		});
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
    			add_location(span, file$2, 40, 4, 904);
    			add_location(br, file$2, 41, 4, 953);
    			attr_dev(input, "type", "file");
    			attr_dev(input, "id", "fileInput");
    			add_location(input, file$2, 42, 4, 965);
    			add_location(div0, file$2, 39, 2, 893);
    			attr_dev(div1, "id", "fileDrop");
    			attr_dev(div1, "class", "svelte-taa5e1");
    			add_location(div1, file$2, 45, 2, 1017);
    			attr_dev(div2, "class", "container svelte-taa5e1");
    			add_location(div2, file$2, 38, 0, 866);
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

    			if (!mounted) {
    				dispose = [
    					listen_dev(div1, "dragover", prevent_default(/*divDragOver*/ ctx[0]), false, true, false),
    					listen_dev(div1, "drop", prevent_default(/*newHandReceipt*/ ctx[1]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
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
    		e.target;

    		if (e.dataTransfer.getData("text")) {
    			console.log("text was dropped");
    			console.log(e.dataTransfer.getData("text"));
    		} else if (e.dataTransfer.files) {
    			let theText = e.dataTransfer.files[0].text();
    			theText.then(x => console.log(x));
    			console.log("file was dropped");
    		} else {
    			console.log("i dont know what was dropped");
    		}

    		e.target.style.backgroundColor = "lightblue";
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<InputHR> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ divDragOver, newHandReceipt });
    	return [divDragOver, newHandReceipt];
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

    // (15:0) {:else}
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
    		source: "(15:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (11:0) {#if hand_receipt}
    function create_if_block(ctx) {
    	let t;
    	let propertytable;
    	let current;
    	propertytable = new PropertyTable({ $$inline: true });

    	const block = {
    		c: function create() {
    			t = text("You have a hand receipt\r\n\r\n  ");
    			create_component(propertytable.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			mount_component(propertytable, target, anchor);
    			current = true;
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
    		source: "(11:0) {#if hand_receipt}",
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
    			add_location(h1, file$1, 8, 0, 174);
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

    			if (current_block_type_index !== previous_block_index) {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
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
    			attr_dev(span, "class", "svelte-zdkb2l");
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
    			props: { hand_receipt: /*hand_receiptt*/ ctx[0] },
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
    		p: noop,
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
    	let hand_receiptt = false;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Header, Content, Rain, hand_receiptt });

    	$$self.$inject_state = $$props => {
    		if ("hand_receiptt" in $$props) $$invalidate(0, hand_receiptt = $$props.hand_receiptt);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [hand_receiptt];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const App = {

        init: function() {
            console.log('=> App.init()');

            // Initialize Application User
            // App.User = {};

            // Initialize Application State
            App.State = {
                hasHandReceipt: false,
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

        getHandReceipt: function() {
            // hand_receipt : function(){
                //check if hand rectip exist
            // }
        }
    };

    window.onload = () => {
        App.init();
    };

}());
//# sourceMappingURL=bundle.js.map

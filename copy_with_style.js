/**
 * Copy With Style.
 *
 * Provides support of a copy button on a web page that copies a nominated elements true to its rendered style,
 * to the clipboard. Offers th option to include all styles with a <style> tag prefixing the elements outerHTML,
 * or alternately with a "style" attributes added to each element (the nominate element and all its children),
 * called ""inlining" styles.
 *
 * Inlining styles (applying them as a "style" attribute one each element) is expensive (slow) and produces more
 * data, conceivably much more data than not inlining them (providing them via a <style> tag), but produuces a copy
 * that can reliably be emailed. Most email clients today (2021) have patchy or no support for the style tag.
 * Conversely most email clients respect and render inline style attributes faithfully.
 *
 * @link   https://github.com/bernd-wechner/Copy-with-Style/
 * @file   This files defines the Copy_With_Style class.
 * @author Bernd Wechner.
 * @copyright 2001
 * @license Hippocratic License Version Number: 2.1.
 */

class Copy_With_Style {
    element = null; // The element to copy to the clipboard (with style!)
    button = null; // The button that, we attach a click even handler to to copy the the element to the clipboard
    mode = null; // "attribute" (to inline all styles with a "style" attribute on each element) or "tag" (to include a "style" tag)
    progress = null; // A progress element that is a sibling or child of the button by default but can be specified explicitly.
    stylesheets = "inline";

    // Show a progress bar if we can find one as a sibling or child of element
    show_progress = true;

    // We wrap the nominated element in a div that is not in the DOM. We can copy the wrapper
    // with the element or not. Matters little it's a simple div.'
    copy_wrapper = true;

	// Styling classes for the button. A supplie button is given these clases to communicate state of 
	// the preparation and copy.
	class_button = null;
	class_preparing = null;
	class_ready = null;

	// Element exclusion overrides and augmentations. These are all function that are called
	// if defined and passed an HTML element as their sole argument. Thy must return true or 
	// false, true to exclude, false to keep.
	//
	// the extra_ pair are in addition tod efault implentations
	// the other two replace the default implementations
	//
	// Deep exclusions eclude the element and all its children.
	// Shallow exclusion exlcude the element and graft its chidlren onto its parent.
	deep_exclusions = null;
	shallow_exclusions = null;
	extra_deep_exclusions = null;
	extra_shallow_exclusions = null;

    // If we are inlining styles on a huuuge element we may wish to permit a responsive UI while we're inlining it.
    // This will slow down inlining enormously though, and may never have a net reward. In one trial Chrome processed
    // 3000 elements per second without deferal to UI (locking the UI), and 200 with deferal to the UI a 15. In any
    // case at 3000 elements per second for this to cost more than say a tolerable 2 second delay in production the
    // element must be 6000 elements or larger.
    //
    // To wit, we support 3 values here:
    // 	false - do not defer to the UI at all
    //  true - defer to the UI after every element is inlined
    //  a list of two ints describing [threshold, frequency]
    // 		where we defer to UI only if there are more than threshold elements
    //		and only after batches of "frequency" elements are inlined.
	//      a frequency of 0 request optimisation (i.e. number of elements per progress bar pixel)
    defer_to_UI = false;

    // Copying is divided into two stages to cope with extremely large elements if need be.
    //    1. Prepration:  this.prepare_copy()
    //    2. Copying the preapred strinsg to the clipboard:  this.to_clipboard()
    //
    // A preparation can be triggered by any of these events:
    //
    // "button"     this.copy() will be attached to the button provided in the constructor else this.to_clipboard() will be.
    // "schedule"   this.schedule_preparation() is called on creation so a prepation is triggered after the DOM is fully rendered
    // "observe"	an observer will be attached to element and when it sees anyc hange, will call this.prepare_copy()
    //
    // triggers is a list the events that shoudl trigger a preaparation.
    // An empty list means you need to call this.prepare_copy() expicitly or this.copy() - which calls this.prepare_copy().
    triggers = ["button"];

	// If true will watch the element and invalidate any preparations if it changes.
	// This is distinct from a trigger of "observe" which triggers a copy preparation
	//this only request invalidation of an existing preparation.
	observe = true;

    // When inlining styles we make a clone of the element to be copied, so we can inline them off DOM.
    // We walk over all the children of the element to be copied using .querySelectorAll('*') and rely
    // on that returning the same elements in the same order for both the original and clone. Empirically
    // this seems reliably to be the case, but I haven't found it documented anywhere that the oder of
    // elements returned by querySelectorAll is deterministic and consistent. So a check is implemented.
    // Never having seen it fail, we disable it by default. Enabling it adds a little overhead to the copy.
    check_clone_integrity = false;

    // Optionally a list of CSS classes that, when having styles inlined will, when encountered
    // trigger a debugger break (so you can examine the internals in the browser''s debugger)
    // Will only trigger if a debugger is active of course. Pressing F12 in yoru browser will
    // probably bring one up.
    classes_to_debug = []; // "highlight_changes_on"

    // Optionally a list of styles that, when having styles inlined will, when encountered
    // trigger a debugger break (so you can examine the internals in the browser''s debugger)
    // Will only trigger if a debugger is active of course. Pressing F12 in yoru browser will
    // probably bring one up.
    styles_to_debug = []; // "background-color";

    // The HTML and text strings (renditions) of element
    HTML = "";
    text = "";

    // If true log the HTML or text rendition prepared, and the HTML or text put onto the clpboard to the console, for diagnostic purposes.
    log_HTML_to_console = false;
    log_text_to_console = false;

    // Write a performance summary to console
    log_performance = false;

    // Write useful tracing info out to console
    debug = false;

	// Use testing code
	test = true;

    /*****************************************************************************************
	Public Methods
    ******************************************************************************************/

    constructor({
        button,
        element,
        stylesheets = [],
        mode = "attribute",
        defer = [50000,0],
        triggers = ["button"],
		observe = true,
        progress = false,
        copy_wrapper = true,
		class_button = "copy_with_style",
		class_preparing = "preparing_for_copy",
		class_ready = "ready_to_copy",
		deep_exclusions = null,
		shallow_exclusions = null,
		extra_deep_exclusions = null,
		extra_shallow_exclusions = null,
		debug = false,
		log_performance = false,
		log_HTML_to_console = false,
		log_text_to_console = false,
		check_clone_integrity = false,
		classes_to_debug = [],
		styles_to_debug = []
    } = {}) {
        this.button = button;
        this.element = element;
        this.stylesheets = stylesheets;
        this.mode = mode;
        this.defer_to_UI = defer;
        this.triggers = triggers;
		this.observe = true;
        this.show_progress = progress ? true : false;
        this.copy_wrapper = copy_wrapper;
		this.class_button = class_button,
		this.class_preparing = class_preparing,
		this.class_ready = class_ready,
		this.deep_exclusions = deep_exclusions,
		this.shallow_exclusions = shallow_exclusions,
		this.extra_deep_exclusions = extra_deep_exclusions,
		this.extra_shallow_exclusions = extra_shallow_exclusions,
        this.debug = debug;
		this.log_performance = log_performance;
        this.log_HTML_to_console = log_HTML_to_console;
        this.log_text_to_console = log_text_to_console;
        this.check_clone_integrity = check_clone_integrity;
        this.classes_to_debug = classes_to_debug;
        this.styles_to_debug = styles_to_debug;

    	if (this.debug) console.clear();
		if (this.debug) console.log(`Configuring progress: ${progress instanceof HTMLElement}, ${progress.tagName}, ${button.parentElement.querySelector("progress")}, ${this.show_progress}`);

        this.progress = (progress instanceof HTMLElement && progress.tagName === "PROGRESS") ? progress : button.parentElement.querySelector("progress");

		// If we're showing a progress bar we MUST defer to UI or it won't update
		if (this.show_progress && this.progress) 
			if (this.defer_to_UI) 
				this.defer_to_UI[0] = 0;    // Force a deferral or progress bar won't update, butleave the frequency as specified 
			else 
				this.defer_to_UI = [0, 0];  // Force deferral, and request optimised frequency

        this.HTML = null;
        this.text = null;

		if (this.debug) console.log(`Configuring button: ${triggers}`);
		this.button.classList.add(this.class_button); // The default styling class
        if (this.triggers.includes("button"))
            button.addEventListener("click", this.copy.bind(this));
        else
            button.addEventListener("click", this.to_clipboard.bind(this));

		if (this.debug) console.log(`Configuring schedules: ${triggers}`);
        // This sechedules an observation as well if need but only after the DOM is completely rendered.
        if (this.triggers.includes("schedule"))
            this.#schedule_preparation();
        // Only needed if not scheduling, we explicitly schedule observation to start when the DOM has finished rendering.
        else if (this.triggers.includes("observe") || this.observe)
            this.#schedule_observation();
    }

    async copy() {
		if (!this.#is_prepared) await this.prepare_copy();
        this.to_clipboard();
    }

    async to_clipboard() {
		if (this.debug) console.log(`to_clipboard started: is_prepared? ${this.#is_prepared}`)
        //if (!this.#is_prepared) await this.prepare_copy();
        this.button.disabled = true;

        if (this.log_HTML_to_console) {
            console.log("to_clipboard HTML:");
            console.log(this.HTML);
        }

        if (this.log_text_to_console) {
            console.log("to_clipboard text:");
            console.log(this.text);
        }

        await this.#copy_to_clipboard();

        this.button.disabled = false;
		if (this.debug) console.log(`to_clipboard done`)
    }

    // An internal bail request. Because prepare_copy() defers to UI maintaining an interactive UI a user
    // can make changes to element meaning we have to start the perparation again, i.e. bail the one
    // that's running and start again. These flags effect that interation.
	#is_being_prepared = false; // Set when prepare_copy starts.
	#is_prepared = false; // Set when prepare_copy is finished (to completion and has prepared this.HTML and this.text)
    #bail = false; // Set to request a bail
    #bailed = false; // Set when the request is honoured

	// A working copy of element used for preparing the copy
	#clone = null; 

	// Invalidate any existing copy preparation
    invalidate() {
		this.#is_prepared = false;
		this.button.classList.remove(this.class_ready); 
	}

	// If element take ssome time to get ready, (build the HTML for), any bulder can call .lock() before starting
	// and then .prepare_copy_when_ready() to manage the copy button state nad appearance sensibly. 
    lock() {
        this.#is_prepared = false;

        // We disable the copy button, but only if preapre_copy() is not button triggered. If it is,
        // we need the button enabnled to trigger a preparation.
        if (!this.triggers.includes("button")) this.button.disabled = true;
    }

	// Small failsafe entry point (a rnderer can call this and remain in place, if the trigger is changed at
	// the place where Copy_With_Style is instantiated oto add or remove a button trigger this entry point 
	/// can remain unchanged) 
	async prepare_copy_when_ready_unless_button_bound(fingerprint="no fingerprint") {
		if (!this.triggers.includes("button")) this.prepare_copy_when_ready(fingerprint);
	}

	// self.prepare_copy with readiness checks and security.
	// Optionial fingerprint for debug logging (intended only to identify event handlers that land here uniquely)
	async prepare_copy_when_ready(fingerprint="no fingerprint") {
        async function prepare_the_copy() {
			if (await this.#ready_to_prepare(fingerprint)) {
				if (this.debug) console.log(`${fingerprint} Rendering is complete. Requesting prepare_copy() ... (this.#bail: ${this.#bail}, this.#bailed: ${this.#bailed})`);
				this.prepare_copy(); // no need to await it, just let it run (and return, no drama) 
			} else
				if (this.debug) console.log(`${fingerprint} NOT ready to preapre!`);
        }

        function schedule_prepare_the_copy() { 
			setTimeout(prepare_the_copy.bind(this)); 
		}

		if (this.debug) console.log(`${fingerprint} Waiting for render to complete ...`);
		requestAnimationFrame(schedule_prepare_the_copy.bind(this));
	}

    // This can be slow on very large elements and so we offer support for
    // a progress  bar and  letting UI interactions continue while it is done.
    // Here is a good discussion: https://stackoverflow.com/a/21592778/4002633
    async prepare_copy() {
        const element = this.element;
        const sheets = this.stylesheets;

        if (this.debug) console.log(`prepare_copy started: ${element.id}`);
        let start = performance.now();
        this.#is_being_prepared = true;
        this.button.disabled = true;
		this.button.classList.add(this.class_preparing);
		await this.#defer_to_UI(); // Allow the button to render disabled

        if (this.debug) console.log(`Preparing progress bar: ${this.progress}, ${this.show_progress}`);
        if (this.progress) {
            if (this.show_progress) {
		        if (this.debug) console.log(`Enabling progress bar!`);
                this.progress.value = 0;
                this.progress.style.display = "inline";
            } else {
		        if (this.debug) console.log(`Disabling progress bar!`);
                this.progress.style.display = "none";
            }
        }

        this.#clone = this.element.cloneNode(true); // Clone the element we want to copy to the clipboard

        // create a wrapper (that we will try to copy)
        const wrapper = document.createElement("div");
        wrapper.id = 'copy_me_with_style';

        let nelements = null;

        if (this.mode == "attribute") {
            const source = this.element.querySelectorAll('*');
            const target = this.#clone.querySelectorAll('*');
            const pairs = this.#zip([Array.from(source), Array.from(target)]);

            nelements = pairs.length;

            // Perform an integrity check on the two element lists
            let cloned_well = true;
            if (this.check_clone_integrity) {
                for (pair of pairs)
                    if (pair[0].outerHTML !== pair[1].outerHTML)
                        cloned_well = false;
            }

            if (this.log_performance) {
                const done = performance.now();
                const runtime = done - start;
                const rate1 = runtime / nelements;
                const rate2 = nelements / runtime * 1000;
                console.log(`Cloned and prepared ${nelements.toLocaleString()} elements in ${runtime.toLocaleString()} ms, for ${rate1.toLocaleString()} ms/element or ${rate2.toLocaleString()} elements/s`)
                start = performance.now()
            }

            if (cloned_well) {
                let defer = this.defer_to_UI;
                let i = 0;

                if (this.show_progress && this.progress) {
						this.progress.max = nelements;
						await this.#defer_to_UI();
						// If frequency is 0, optimise it (find how many elements per pixel in the bar and don't refresh more often than that)
						if (defer[1] === 0) {
							const bar_width = this.#bar_width(this.progress);
							defer[1] = Math.floor(nelements / bar_width);
					        if (this.debug) console.log(`Optimised UI deferral: [${defer}] by spreading ${nelements} elements over ${bar_width} pixels of progress bar.`);
						}
				} else {
					// If frequency is 0, use a default, empirically optimised value
					if (defer[1] === 0) {
						defer[1] = 1000;
				        if (this.debug) console.log(`Optimised UI deferral: [${defer}] using a default, empirically opimised frequency.`);
					}
				}
				
		        if (this.debug) console.log(`UI deferral policy: [${defer}]. Now inlining styles for ${nelements} elements.`);

				
                for (let pair of pairs) {
                    if (!this.#exclude_from_copy(pair[0])) { 
                        await this.#inline_style(pair[0], pair[1]);
                        i++;
                    }
                    if (this.show_progress && this.progress) this.progress.value = i;
                    if (defer && (typeof(defer) === "boolean" || (Array.isArray(defer) && defer.length == 2 && nelements > defer[0] && i % defer[1] === 0)))
                        await this.#defer_to_UI();
                    if (this.#bail) {
                        if (this.debug) console.log("Bailing ...");
                        break;
                    }
                }

                if (this.log_performance) {
                    const done = performance.now();
                    const runtime = done - start;
                    const rate1 = runtime / nelements;
                    const rate2 = nelements / runtime * 1000;
                    console.log(`Inlined styles on ${nelements.toLocaleString()} elements in ${runtime.toLocaleString()} ms, for ${rate1.toLocaleString()} ms/element or ${rate2.toLocaleString()} elements/s`)
                    start = performance.now()
                }

                if (!this.#bail) {
                    // Remove hidden elements, not needed when styles are inlined
                    // When including a <style> element (below) these are still useful
                    // as the CSS styles support transitions - like :hover.
                    for (let pair of pairs) {
                    	let [s, t] = pair;
						//if (s.nodeName === "SPAN") debugger;
                        if (this.#deep_exclude_from_copy(s)) t.remove();
					}

					// Remove and shallow exclusions next. This is tricky and demands a bottom up
					// pruning. A linear or top down approach can lead to trouble as the element 
					// tree changes. Bottom up ensures that when a shallow exclusion is pruned 
					// it's children remain grafted to the parent. 
					this.#prune_clone();
				}

                if (this.log_performance) {
                    const done = performance.now();
                    const runtime = done - start;
                    const rate1 = runtime / nelements;
                    const rate2 = nelements / runtime * 1000;
                    console.log(`Removed hidden elements from ${nelements.toLocaleString()} elements in ${runtime.toLocaleString()} ms, for ${rate1.toLocaleString()} ms/element or ${rate2.toLocaleString()} elements/s`)
                    start = performance.now()
                }
            }
        } else if (this.mode == "tag") {
            const style = document.createElement("style");
            for (let sheet of document.styleSheets) {
                if (sheet.href && (sheets.length == 0 || sheets.includes(this.#basename(sheet.href)))) {
                    let rules = [];
                    for (let rule of sheet.cssRules) rules.push(rule.cssText)

                    style.append(rules.join('\n'));
                }
            }

            wrapper.append(style);
        }

        if (!this.#bail) {
            // Add the cloned element to the wrapper
            wrapper.append(this.#clone);

            // Grab the HTML
            this.HTML = this.copy_wrapper ? wrapper.outerHTML : wrapper.innerHTML;

            // Grab the Text. Chrome provides innerText and outertext. Firefox only innerText. Both look the
            // same on chrome to me.
            this.text = element.innerText;

            if (this.log_HTML_to_console) {
                console.log("prepare_copy HTML:");
                console.log(this.HTML);
            }

            if (this.log_text_to_console) {
                console.log("prepare_copy text:");
                console.log(this.text);
            }
        }

        this.button.disabled = false;
		this.button.classList.remove(this.class_preparing);
		this.button.classList.add(this.class_ready);

        this.#is_prepared = true;
        this.#is_being_prepared = false;
        if (this.progress) this.progress.style.display = "none";
        if (this.#bail) {
            this.#bail = false;
            this.#bailed = true;
            if (this.debug) console.log("Bailed ...");
        };
        if (this.debug) console.log(`prepare_copy finished: ${element.id}, produced: ${this.HTML ? this.HTML.length : 0} characters of HTML amd ${this.text ? this.text.length : 0} characters of text.`);
    }

    /*****************************************************************************************
	Private Methods
	
	https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields
    ******************************************************************************************/

    // S.B.'s solution for finding CSS rules that match a given element.
    //		See: https://stackoverflow.com/a/22638396/4002633
    // Made more specific to finding the styles that these CSS rules impact.
    async #CSS_styles(el, sheets=this.stylesheets) {
        let styles = [];

        // First get the style attribute
        const style_attr = el.getAttribute("style");
        if (style_attr) {
            const attr_styles = style_attr.split(';');
            for (let rule of attr_styles)
                if (rule) {
                    const [n, v] = rule.split(':');
                    const N = n == undefined ? '' : n.trim()
                    const V = v == undefined ? '' : v.trim()
                    styles.push(N);
                }
        }

        // Then match the class attribute defined styles
        for (let sheet of document.styleSheets) {
            if (sheet.href && (sheets.length == 0 || sheets.includes(this.#basename(sheet.href))))
                try {
                    for (let rule of sheet.cssRules) {
                        if (el.matches(rule.selectorText)) {
                            const new_styles = Array.from(rule.style).filter(s => !styles.includes(s));
                            styles.push(...new_styles);
                        }
                    }
                }
            catch (err) {
                // CORS errors land here
                // To avoid them, make sure on cross origin (CDN) style sheet links to include
                // 		crossorigin="anonymous" referrerpolicy="no-referrer"
                console.log(`Failed to get rules from: ${sheet.href}\n${err}`)
            }
        }

        return styles;
    }

    async #inline_style(source_element, target_element) {
        // This gets ALL styles, and generates  HUGE results as there are MANY
        const cs = window.getComputedStyle(source_element);
        const css_matches = await this.#CSS_styles(source_element);

        let debug_class = false;

        if (this.classes_to_debug.length > 0) {
            for (let Class of this.classes_to_debug)
                if (source_element.classList.contains(Class))
                    debug_class = true;
        }

        if (debug_class) debugger;

        // Add the user styles we found
        for (let r = 0; r < cs.length; r++)
            if (css_matches.includes(cs.item(r)))
                target_element.style[cs.item(r)] = cs.getPropertyValue(cs.item(r));
    }

    // Straight from: https://stackoverflow.com/questions/26336138/how-can-i-copy-to-clipboard-in-html5-without-using-flash/45352464#45352464
    async #copy_to_clipboard() {
		const bound_handler = handler.bind(this);
		
        function handler(event) {
			if (this.debug) console.log(`copy event handler triggered!`)
            event.clipboardData.setData('text/html', this.HTML);
            event.clipboardData.setData('text/plain', this.text);
            event.preventDefault();
            document.removeEventListener('copy', bound_handler, true);
			this.copied = true;
        }

		document.addEventListener('copy', bound_handler, true);
		if (!document.execCommand('copy')) {
			// The only reason currently know for failure is when Firefox issue sthis warning:
			// 		document.execCommand(‘cut’/‘copy’) was denied because it was not called from inside a short running user-generated event handler.
			// Chrome based broswers just fail silentlyon same condition. What it means is the the button handler took too long inlining styles
			// and the copy command has been disabled.Browsers stipulate that any event handler executing copy, do so within a certain time threshold.
			// Intended to protect users form Javascript doing random stuff to the clipboard witout a users knowledge, Not an unreasonable approach
			// which arguest that to be sure the copy command is auysers intent the time between executing it and starting the click event handler 
			// should not exceed some threshold. 
			// 
			// In practice this never happens unless the elemnet is very large and inlining take s a long time.  But if it does, we
			// will simple flag that the copy is ready and invote (through the styling choices) the user to click it again to do an 
			// actual copy. prepare_copy() will have style the button alread appropriately and set this.#is_prepared. So  we have
			// naught to do here and can pass silently.
			if (this.debug) console.log(`Copy command looks to have timed-out.`)
			document.removeEventListener('copy', bound_handler, true);
		}
    }

    #schedule_preparation() {
        async function handler() {
	        if (this.debug) console.log(`Scheduled copy preparation triggered ... triggers: ${this.triggers}, preparations: ${this.#is_being_prepared}, ${this.#is_prepared}, ready state: ${document.readyState}`);
	            if (!this.#is_prepared && !this.#is_being_prepared && document.readyState === 'complete') {
                // Schedule and observation before preparation starts, for the simple reason that
                // preparation can take a long time with very very large elements and so if
                // this.defer_to_UI is enabled then user interactions might cause a change to the
                // element. The mutatino handler will in that case ask the preparation to bail and
                // restart one.
                if (this.triggers.includes("observe")) {
			        if (this.debug) console.log(`Starting observer`);
					this.#observe_element();
				}
		        if (this.debug) console.log(`Starting preparation`);
                await this.prepare_copy();
            }
        }
        if (this.debug) console.log(`Scheduling a copy preparation ...`);
        this.button.disabled = true;
        document.addEventListener('readystatechange', handler.bind(this));
    }

    #schedule_observation() {
        async function handler() {
	        if (this.debug) console.log(`Scheduled observer triggered ... triggers: ${this.triggers}, observe? ${this.observe}, preparations: ${this.#is_being_prepared}, ${this.#is_prepared}, ready state: ${document.readyState}`);
            if (!this.#is_prepared && !this.#is_being_prepared && document.readyState === 'complete')
                if (this.triggers.includes("observe") || this.observe) {
			        if (this.debug) console.log(`Starting observer`);
                    this.#observe_element();
				}
        }
        if (this.debug) console.log(`Scheduling an observer ...`);
        document.addEventListener('readystatechange', handler.bind(this));
    }

    #observer = null;

    #observe_element() {
        this.#observer = new MutationObserver(this.#mutation_handler.bind(this));

        this.#observer.observe(this.element, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeOldValue: true,
            characterData: true,
            characterDataOldValue: true
        });
    }

	// Check if we're ready to prepare for a copy
	async #ready_to_prepare(fingerprint="no fingerprint") {
		if (this.debug) console.log(`${fingerprint} Document Ready State: ${document.readyState}`);
        // If prepare_copy() is running and is not complete
        if (this.#is_being_prepared) {
            // if it's already been asked to bail, kick back and let it do just that
            if (this.#bail) {
                if (this.debug) console.log(`${fingerprint} Already bailing ... let it be.`);
                // Let it act on the signal and bail request
                await this.#defer_to_UI();

            // if it's not already been asked to bail, then ask it to bail
            } else {
                if (this.debug) console.log(`${fingerprint} Requesting bail...`);
                this.#bail = true;

                // Let it act on the signal and bail request
                await this.#defer_to_UI();

                // Check if it did bail!
                if (this.#bailed) {
                    if (this.debug) console.log(`${fingerprint} Observed bail... `);
                    this.#bailed = false;
                } else {
                    if (this.debug) console.log(`${fingerprint} REQUESTED BAIL NOT HONORED!`);
                }
            }
        }
		
		return !this.#is_being_prepared;
	}
	
	// Mutation observers are triggered only after the DOM is redrawn
	// So it's safe to assume changes have already been applied to the DOM
    async #mutation_handler(mutations) {
        const fingerprint = performance.now();
        if (this.debug) console.log(`${fingerprint} mutation: readystate is ${document.readyState}`);
		this.invalidate(); // Invalidate any existing preparation 
		if (this.triggers.includes("observe")) // If a preparation trigger is bound to the observaion, prepare when ready.
			self.prepare_copy_when_ready(fingerprint);
    }


    /*****************************************************************************************
    Element exclusion defintions (elements to exclude from the copy when inlining styles). 
	There are two types:

    deep exclusion: meaning we remove the matched element and all its children. This is 
					intended to apply to hidden elements. Ther eis no need to inclde them 
					in a copy, they just consume space on the clipboard and where you paste
					to, but are not visible. 
					
	shallow exclusion: Only the element is excluded, its children are grafted to its parent.
					   This is intended for useless wrappers. The two standard cases 
					   implemented are: A tags that link to local site URLS (those starting 
					   with /) - such links don't reolve in any pasted context. The source 
					   element can always write them with full URLS if wishing to see them 
					   copied. and DIV tags with the "tooltip" class. Reserved calass name 
					   for tooltip implemetations that wrap text thatbhas a tooltip in such
					   a DIV.
    ******************************************************************************************/

    // Determine if a given element is hidden. When inlining styles, hidden elements are dropped.
    #deep_exclude_from_copy(element) {
		if (typeof this.deep_exclusions === 'function')
			return this.deep_exclusions(element);
		else {
			const style = window.getComputedStyle(element);      
	        let exclude = (style.visibility === "hidden" || style.display === "none");
			if (typeof this.extra_deep_exclusions === 'function')
				exclude = exclude || this.extra_deep_exclusions(element);
			return exclude; 
		}
    }

    // We also drop any anchor (A) tags that link to a local URL (one begining with /) as these 
	// lose meaning in any pasted context. If they are desired it's the source element need only 
	// prepare itself nby including the https://mysite/ prefix to them so they have meaning in a
	// pasted context.
    #shallow_exclude_from_copy(element) {
		if (typeof this.shallow_exclusions === 'function')
			return this.shallow_exclusions(element);
		else {
	        let exclude =  (element.nodeName === "A" && element.getAttribute("href").startsWith("/"))
						|| (element.nodeName === "DIV" && element.classList.contains("tooltip"));
			if (typeof this.extra_shallow_exclusions === 'function')
				exclude = exclude || this.extra_shallow_exclusions(element);
			return exclude; 
		}
    }

    #exclude_from_copy(element) {
        return this.#deep_exclude_from_copy(element) || this.#shallow_exclude_from_copy(element);
    }

    /*****************************************************************************************
    Simple support functions 
    ******************************************************************************************/

    // This is a Javascript oddity.
    // See: https://stackoverflow.com/a/60149544/4002633
    // setTimeout runs a function after a given time (specified in ms).
    // In a promise with no resolve callback (.then()) defined it can be called
    // with effectively a null function. With a 0 time into the future, it returns
    // more or less immediately BUT, the key thing to not is the Javascript single
    // threaded idiosyncracy .. and that setTimeout() is the one known method of
    // yielfing control for a moment to the event loop so that UI events can continue
    // to be handled. To wit, this mysterious little line of code, permits means the
    // UI remains responsive if it is called from time to time.
    #defer_to_UI(how_long = 0) {
        return new Promise(resolve => setTimeout(resolve, how_long));
    }

	// See: https://developer.mozilla.org/en-US/docs/Web/API/Element/clientWidth
	// On one cross check taking screen grabs and measurig the borgress bar and comparing against this
	// Firefox reports correctly and Chromium reports the same number as Firefox, but renders another 
	// 13 pixels wider for some reason. C'est la vie.   
	#bar_width(progress_bar) {
	    const style = window.getComputedStyle(progress_bar);
	    return progress_bar.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
	}

    // A simple basename for matching stylesheets
    #basename(str, sep1, sep2) {
        if (sep1 == undefined) sep1 = '/';
        if (sep2 == undefined) sep2 = '?';
        const parts1 = str.split(sep1);
        const parts2 = parts1[parts1.length - 1].split(sep2);
        return parts2[0];
    }

    // A teeny function that zips two Arrays together (like Python's zip)
    // See: https://stackoverflow.com/a/10284006/4002633
    #zip = rows => rows[0].map((_, c) => rows.map(row => row[c]));

    /*****************************************************************************************
    Bottom up tree pruning methods. 

    We need to walk bottom up to reliably remove the hallow excludes. These are like DIV 
    wrappers and such that we want to remove. They are identidfied by:

    this.#shallow_exclude_from_copy

    and to remove them we set the outerHTML= innerHTML. This is most cleanly and safely done
    from the bottom up, the leaves of the tree.

    Walking up from the bottom is non trivial, but centres on identifying leaves and the twigs 
    that they are attched to. Leaves are nominally those elements with no children and twigs
    are the list of Elements walimg up to (and not including) the first junction. If we process 
    all those from leaf to junction, then the new leaves are thos junctions and we repeat 
    recurisively until we are down to one leaf then none.
    ******************************************************************************************/

	// Enumerate all leaves in element tree (nodes that have no children)
	#enumerate_clone_leaves(element=this.#clone, leaves=[]) {
		if (element.children.length == 0) {
			leaves.push(element);
		} else {
		    for (let child of element.children) {
		        this.#enumerate_clone_leaves(child, leaves);
	    	}
	    return leaves;
		}
	}

	// return the twig that an element is on, 
	// being the list of nodes from element up to the first junction
	#twig(element) {
		let e = element
		let twig = [e];
		while (e.parentElement.children.length == 1) {
			e = e.parentElement;
			twig.push(e);
			if (e.parentElement === null) break; // We've reached the top!
		}
		return twig;
	}

	// enumerate all the twigs in element tree (that have leaves at the end)
	#enumerate_clone_twigs(leaves=this.#enumerate_clone_leaves(), element=this.#clone, twigs=[]) {
		for (let leaf of leaves)
			twigs.push(this.#twig(leaf));
		return twigs;
	}
	
	#prune_twigs(twigs=this.#enumerate_clone_twigs()) {
		for (let twig of twigs)
			for (let element of twig)
				if (this.#shallow_exclude_from_copy(element))
					element.outerHTML = element.innerHTML;
					
		// return the new leaves (considerig all these twigs pruned)
		let leaves = [];
		for (let twig of twigs) {
			const parent = twig.pop().parentElement
			if (parent !== null && !leaves.includes(parent)) leaves.push(parent);
		}
		
		return leaves;
	}
	
	#prune_clone() {
		let leaves = this.#enumerate_clone_leaves();
		let twigs;
		while (leaves.length > 0) {
			twigs = this.#enumerate_clone_twigs(leaves);
			leaves = this.#prune_twigs(twigs);
		}
	}
}

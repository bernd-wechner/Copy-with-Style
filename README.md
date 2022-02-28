![Copy with Style](https://raw.githubusercontent.com/bernd-wechner/Copy-with-Style/master/copy-with-style.png)

## Copy With Style

A simple single file (or two with a small .css file), JavaScript class under 1000 lines, using only native ES6 and no external libraries that can by attached to a `button` and associated with an `element` such that when the button is clicked the element is copied to the clipboard as true as possible to what is rendered in the browser.

This is all executed client side with no server call backs required. A core part of its offering is to (optionally) in-line all styles before placing HTML on the clipboard. That is neeeded because, as at 2021 the only email client I have found that actually respects embedded `<style>` tags, is Thunderbird. Every other client tried strips them, and respects only `style` attributes on other elements (in-line styles).

The implementation seeks to be simpler, more modern and better than:

- Juice: https://github.com/Automattic/juice

- inline-css: https://github.com/jonkemp/inline-css

- css-inliner: https://github.com/broadly/css-inliner

and written out of frustration that no other solution was found (using modern narive JavaScript running client side).

It is smaller than any of those and yet includes the plumbing for a copy button and all of the automating of style-lining.

## The Code

We expose a single class `Copy_With_Style` that can be instantiated in client-side JavaScript. For example:

```javascript
const clipboard = new Copy_With_Style({ button: document.getElementById("button_to_copy"),
                                        element: document.getElementById("element_to_copy"),
                                        stylesheets: ["default.css"],
                                      }); 
```

To clarify, this is delectably clear and intutitve JavaScript notation (not - sarcasm detected)! It is the de facto standard all the same, for passing a list of optional, named arguments to a function (in this case a [class](https://www.w3schools.com/Js/js_classes.asp) constructor).

It works using a JavaScript object which is an arbitray container for attributes and is [described well enough by others](https://afontcu.medium.com/cool-javascript-9-named-arguments-functions-that-get-and-return-objects-337b6f8cfa07).

Important to note is only that in reality there is only one argument, which is an [object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) and can be written like so in JavaScript:

```javascript
const myobj = {}
```

Looks a bit like [Python dictionary](https://www.w3schools.com/python/python_dictionaries.asp) to us but hey, in JavaScript it's an object but looks and works the same way more or less. That is, it can contain properties and be [initialized](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer) as follows:

```javascript
const myobj = {prop1: val1, prop2: val2, prop3: val3}
```

JavaScript is a little more flexible here and you could also write:

```javascript
const myobj = new Object();
myobj.prop1 = val1;
myobj.prop2 = val2;
myobj.prop3 = val3;
```

Awesome consistency (you can tell, we're in love with JavaScript here!).

## The Arguments

What you need to know is that the single object argument that `Copy_With_Style` takes can have these attributes (default values are shown and if missing are mandatory arguments, or attributes or properties or whatever you like to call them, but they have no default value and hence, are mandatory):

| Argument                     | Default value          | Description                                                  |
| ---------------------------- | ---------------------- | ------------------------------------------------------------ |
| **button**                   | None                   | an [HTML element](https://developer.mozilla.org/en-US/docs/Glossary/Element) that can be clicked. Ideally a [button](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button) element. If it has a progress element as a child or sibling this can be used for monitoring [progress](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress) on style inlining. Unnecessary unless you are copying very large HTML elements, with many 10s or 100s of thousands of children. |
| **element**                  | None                   | an [HTML element](https://developer.mozilla.org/en-US/docs/Glossary/Element) that will be copied (with all its children) to the clipboard when **button** is clicked. |
| **stylesheets**              | `[]`                   | An [array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) of strings that represent (name) CSS style sheets. For example `["default.css", "extras.css"]`. If this is a non-empty array then only styles from these sheets will be included in the copy. If you know that your element only draws styles from specific sheets, then specifying them can speed up the style in-lining and/or shrink the size of the copy. Otherwise all the stylesheets that the document includes will be used (scanned and included in a `<style>` tag if mode is "tag"). |
| **summarize_details**        | true                   | Meaningful only if **mode** == "attribute"  and requests that when in-lining styles, all DETAILS tags are replaced by their SUMMARY. Details are poorly supported by mail readers and tend to render the whole details and the summary. The drill-down nature of Details is lost completely in that context and the presentation simply polluted. And so, by default the details are removed and only the summary retained. |
| **mode**                     | `"attribute"`          | A string. Either "attribute" or "tag". <br />If "tag" then a `<style>` tag is added to the copy and the **element**'s style attributes are left untouched.  This  is fast and can conserve pseudo elements like `:hover`.  Most email clients can't cope with this, but it will produce a rich copy in HTML contexts that do.<br />If "attribute" then the style attributes of **element** and all its children will be updated with style information taken from the **stylesheets** and the browser's computed styles, to produce as true a copy as possible. This produces a larger copy generally than "tag" but is respected by most email clients today. It's also a lot slower to produce. If your element is large enough this can carry significant processing costs. Our timings see an element with ~100,000 children taking ~40s to process, |
| **defer**                    | `[50000,0]`            | Meaningful only if **mode** == "attribute" and determines if and how often the style in-liner will defer to the UI to keep the UI responsive. Possible values are:<br />`true`: defer to the UI after every element is processed. Not recommended, slows down processing **immensely**.<br />`false`: never defer to the UI while in-lining styles. This will lock the UI until finished (that is the browser will not respond, no scrolling, no nothing). No problem for small elements (processed in a fraction of one second, but can be bothersome for very large elements (taking 10s of seconds to process).<br />`[threshold, frequency]`: The UI is deferred to, only if more than `threshold` elements are being copied, and only once every `frequency` elements are processed. If `frequency` is `0` and a **progress** bar is specified, it is is optimised to be number of elements per progress bar pixel.<br />The default is recommended. |
| **triggers**                 | `["button"]`           | Meaningful only if **mode** == "attribute" and determines how and when style inlining is triggered. This is an array of triggers and can contain:<br />`"button"`: to request that style in-lining happen when the copy **button** is clicked.<br />`"schedule"`: to schedule a style in-lining once the DOM is fully rendered.<br />`"observe"`: to request that **element** be observed, and if it's seen to change, then a style in-lining will be triggered. This is useful if **element** is responsive to user interactions. If **defer** is set to maintain a responsive UI any change to **element** will trigger a request for any existing style in-lining to bail and start one anew.<br />Sensible combinations are:<br />`["button"]` for small and moderate elements.<br />`["schedule", "observe"]`  for extremely large elements. |
| **progress**                 | `false`                | Meaningful only if **mode** == "attribute" and requests that a progress bar be displayed to convey the porgress of style in-lining. Accepts the following values:<br />`false`: no progress bar is used.<br />`true`: a progress bar is used if an HTML `<progress>` element is found as a sibling or child of **element**.<br />an HTML `<progress>` element: specify an element if you prefer, and it will be used. <br />If  a progress bar is being used then **defer** is also set:<br />to `[0, 0]` if it is not set (**defer** == `false`) or <br />the **threshold** is set to 0 if it is an Array of 2 elements (i.e. if **defer** has a **threshold** and **frequency** specified). This is necessary because without a deferral to UI the progress bar will not update (render), so the **threshold** for deferring to UI is forced to 0, but the **frequency**, is honoured. |
| **copy_wrapper**             | `true`                 | **element** is wrapped in a simple [`<div>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/div) with id "copy_me_with_style" before styling (either by "tag" or "attribute" as specified by **mode**). If `true` the wrapper (containing **element** and any style information added) will be placed on the clipboard, if `false` only its contents will be (i.e **element** and any style information added). This is just a convenient way for the copy to produce a single element identifiable by the id "copy_me_with_style". |
| **class_button**             | `"copy_with_style"`    | The named CSS class is assigned to the provided button. This is the buttons rest state, though it conserves this class across all states. When clicked in this state the button will trigger a copy preparation if necessary and a copy of the prepared data to the clipboard. |
| **class_preparing**          | `"preparing_for_copy"` | The named CSS class is assigned to the provided button when copy preparation is in progress. This may be very very quick (near instantaneous) or take some while, depending on choice of **mode** and size of the **element**. Most things are very fast, but "attribute" mode with very large elements can be slow. <u>When in this state the button will either be disabled or trigger a restart of the preparation depending on configuration.</u> |
| **class_ready**              | `"ready_to_copy"`      | The named CSS class os assigned to the provided button when copy preparation is in complete and a copy is ready to place on the clipboard. When clicked in this state the button will simply copy the prepared texts and HTML to the clipboard. |
| **deep_exclusions**          | `null`                 | Meaningful only if **mode** == "attribute" and provides a function to call, which accepts an HTML element as its only argument, and returns true if that element and all its children should be excluded from the copy.<br />The default implementation excludes all hidden (not visible) elements. <br />If provided, this function replaces the default implementation. |
| **shallow_exclusions**       | `null`                 | Meaningful only if **mode** == "attribute" and provides a function to call, which accepts an HTML element as its only argument, and returns true if that element and and only that element should be excluded from the copy (its children are grafted onto the parent).<br />The default implementation excludes all `<A>` tags that link internal to the site (`href` begins with /) and `<DIV>` tags that have the class "tooltip".<br />If provided, this function replaces the default implementation. |
| **extra_deep_exclusions**    | `null`                 | Identical to **deep_exclusions**,  exept that it augments rather than replaces the default implementation. |
| **extra_shallow_exclusions** | `null`                 | Identical to **shallow_exclusions**,  exept that it augments rather than replaces the default implementation. |
| **debug**                    | `false`                | If `true`, debugging information will be written to the console. Useful for checking the scheduling of observation and copy event triggers and such. Was used in developing and tuning this little class and remains in place for future use. |
| **log_performance**          | `false`                | If `true`,  will log style in-lining performance to the console. This was used to arrive at the performance stastics and tune performance. |
| **log_HTML_to_console**      | `false`                | If `true`, will log the styled HTML to the console, where it can be inspected. Useful for debugging if pasting brings no joy. |
| **log_text_to_console**      | `false`                | If `true`, will log the styled text to the console, where it can be inspected. Useful for dandebugging if pasting brings no joy. |
| **check_clone_integrity**    | `false`                | When adding styles, **element** is cloned and it is this clone that is styled and added to the clipboard. `true` requests that after cloning its integrity is checked. It's never failed, and there's no reason it should, and this is unlikely to be of any great use. |
| **classes_to_debug**         | `[]`                   | An array of CSS [class](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class) names. If specified, will break in the browser's debugger during style in-lining when an element with one of the named classes is being processed. A nice way to drill down to specific classes to inspect the JavaScript variables if for any reason style in-lining is not producing joy for a given class. |
| **styles_to_debug**          | `[]`                   | An array of [style](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/style) names. If specified will break in the browser's debugger during style in-lining when an element with one of the named styles being applied is being processed. A nice way to drill down to specific styles to inspect the JavaScript variables if for any reason style in-lining is not producing joy for a given style. This can of course easily be tuned in code as needed but by default they combine with a logical **and** to facilitate pinpointing  specific class/style combinations. |
| **tags_to_debug**            | `[]`                   | An array of [tag](https://developer.mozilla.org/en-US/docs/Glossary/Tag) names. If specified will break in the browser's debugger during style in-lining when an element with one of the named styles being applied is being processed. A nice way to drill down to specific tags to inspect the JavaScript variables if for any reason style in-lining is not producing joy for a given style. This can of course easily be tuned in code as needed but by default they combine with a logical **and** to facilitate pinpointing  specific class/style combinations. |

# The Story Behind Copy With Style

Given the adventure assembling this class involved, there's a lovely story of how it came to be published at [dev.to](https://dev.to) in the [The Thing Is ... series](https://dev.to/thumbone/the-thing-is-on-awesomeness-and-motivation-2i0j).

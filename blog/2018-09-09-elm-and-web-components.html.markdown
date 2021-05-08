---
title: Elm and Web Components
date: 2018-09-09 01:35 PDT
tags: elm, web components
excerpt: Removing Elm ports (to interact with external JS libraries) in favour of Web Components.
---

One of my favorite talks from [Elm Europe 2018] conference was the one about [When and how to use Web Components with Elm] by [Luke Westby], creator of the popular **Elm** live editor [Ellie]. In this fun and enlightening talk, he suggests an alternative way of using external JS libraries in **Elm**, rather than relying on ports. Ports, although being the standard way of communicating with external JS in **Elm**, might not be the right tool for some particular situations, especially when your application grows and you need to handle a significant amount of them. The alternative way he exposes is using [Web Components], which is *a suite of different technologies allowing you to create reusable custom elements — with their functionality encapsulated away from the rest of your code — and utilize them in your web apps*. This solution blew up my mind, so I couldn't resist trying it out myself, and I had the perfect project for it :)

### Revisiting Phoenix & Elm landing page

Some months ago I did a small tutorial about [creating a landing page with Phoenix and Elm], in which we added [Google reCAPTCHA] to add security to the subscription form. Both the initialization and passing the response token are handled using ports, which makes it the perfect candidate for being a custom Web Component. Let's add the definition of the custom element:

```javascript
// assets/js/components/recaptcha.

export default class Recaptcha extends HTMLElement {
  constructor() {
    const self = super();

    self._grecaptcha = null;
    self._token = null;

    return self;
  }

  connectedCallback() {
    this._grecaptcha = grecaptcha.render(this, {
      hl: 'en',
      sitekey: 'your-recaptcha-site-key',
      callback: (token) => {
        this._token = token;
        this.dispatchEvent(new CustomEvent('gotToken'));
      },
    });
  }

  set token(token) {
    this._token = token;

    if (this._grecaptcha !== null && token === null) grecaptcha.reset(this._grecaptcha);
  }

  get token() {
    return this._token;
  }
}
```

We are defining the `Recaptcha` class which extends `HTMLElement` and has the following functions:

- `constructor`, in which we define the internal properties of the component. In our case, we have `_grecaptcha` to store the **reCAPTCHA** plugin instance, and `_token` to store the token received from Google while validating the user.
- `connetedCallback` is one of the [lifecycle callbacks] of any custom element, and in which we initialize the internal **reCAPTCHA** plugin, and dispatches a custom `gotToken` event with the value received from Google.
- `set token()` and `get token()` which are the getter and setter functions for the `token` property.

Once we have defined the `Recaptcha` custom element, let's edit the main `app.js` file to remove use it and also remove the unnecessary port's functionality that we don't need anymore:

```javascript
// assets/js/app.

import Elm from './elm/main';
import Recaptcha from './components/recaptcha';

window.customElements.define('g-recaptcha', Recaptcha);

window.onloadCallback = () => {
  const formContainer = document.querySelector('#form_container');

  if (formContainer) {
    Elm.Main.embed(formContainer);
  }
};
```

We register the custom element using `window.customElements.define` which takes the `name` (requires a dash on it) of the HTML node and the component definition, in our case `Recaptcha`. From now on, we can add  our new `Recaptcha` custom element by adding a `<g-recaptacha></g-recaptcha>` tag, so let's edit them Elm view module to remove the old div we were using to render the `reCAPTCHA` component, and add the new tag:

```elm
-- assets/elm/src/View.elm

module View exposing (view)

-- ...

formView : SubscribeForm -> Html Msg
formView subscribeForm =
		let
			{ fullName, email, recaptchaToken } =
					extractFormFields subscribeForm
		-- ...
		in
		-- ...
            , Html.div
                [ Html.class "field" ]
                [ Html.node "g-recaptcha"
                    [ Html.id "recaptcha"
                    , Html.property "token" <| encodeRecaptchaToken recaptchaToken
                    , Html.on "gotToken" decodeGotToken
                    ]
                    []
                , validationErrorView "recaptcha_token" validationErrors
                ]
						, -- ...



encodeRecaptchaToken : Maybe String -> Encode.Value
encodeRecaptchaToken maybeRecaptchaToken =
    case maybeRecaptchaToken of
        Just recaptchaToken ->
            Encode.string recaptchaToken

        Nothing ->
            Encode.null


decodeGotToken : Decode.Decoder Msg
decodeGotToken =
    Decode.map SetRecaptchaToken <| Decode.at [ "target", "token" ] <| Decode.string

```

To make the custom element work we need to do the following:
- Define the new `g-recaptcha` node using `Html.node`.
- Set the `token` property with `Html.property` which in the component uses internally the `set token(token)` setter function we have defined previously.
- Handle the custom `gotToken` event we have also defined previously, which sets the token in the model after getting it back from the custom element in its `decodeGotToken` decoder.

And, that's it! If we run the application, everything should be working as before, yay!

<img src="/images/blog/phoenix-elm-landing-page/final-result.gif"
alt="Final result" style="background: #fff;" />

### Conclusion

After watching Luke's talk, I was looking forward to spending some free time playing around with **Web Components** and checking by myself how they work and how they play with **Elm**. After implementing the solution, and reviewing the code while writing this post, I have to admit that I  like a lot final result. Having all the functionality related to the component encapsulated in its own definition, and simply rendering it and managing messages using events as with any other HTML node is really cool, and this separation of concerns makes your **Elm** code cleaner and easier to understand and maintain. Although it surely has some drawbacks like browser compatibility (which you can fix using a proper polyfill), I'm going to start using this solution in my current and future projects to explore its benefits and possible limitations more deeply. If you are curious about the final result, [here is the commit] with the needed changes.

Happy coding!


[elm europe 2018]: https://2018.elmeurope.org/
[When and how to use Web Components with Elm]: https://www.youtube.com/watch?v=tyFe9Pw6TVE
[Luke Westby]: https://github.com/lukewestby
[Ellie]: https://ellie-app.com/new
[Web Components]: https://developer.mozilla.org/en-US/docs/Web/Web_Components
[Google reCAPTCHA]: https://developers.google.com/recaptcha/
[creating a landing page with Phoenix and Elm]: /blog/2017/12/02/phoenix-elm-landing-page-pt-1
[lifecycle callbacks]: https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#Using_the_lifecycle_callbacks
[here is the commit]: https://github.com/bigardone/phoenix-and-elm-landing-page/commit/4e9e88037ba7679e6b20fbb942b1b5379db6f418

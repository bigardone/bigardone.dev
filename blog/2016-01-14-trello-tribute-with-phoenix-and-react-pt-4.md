---
title: Trello tribute with Phoenix and React (pt.4)
date: 2016-01-14
tags: elixir, phoenix, react, redux
canonical: https://blog.diacode.com/trello-clone-with-phoenix-and-react-pt-4
published: true
excerpt:
  Adding the front-end for the sign up with React and Redux.
---
<div class="index">
  <p>This post belongs to the <strong>Trello tribute with Phoenix Framework and React</strong> series.</p>
  <ol>
    <li><a href="/blog/2016/01/04/trello-tribute-with-phoenix-and-react-pt-1">Intro and selected stack</a></li>
    <li><a href="/blog/2016/01/11/trello-tribute-with-phoenix-and-react-pt-2">Phoenix Framework project setup</a></li>
    <li><a href="/blog/2016/01/12/trello-tribute-with-phoenix-and-react-pt-3">The User model and JWT auth</a></li>
    <li><a href="/blog/2016/01/14/trello-tribute-with-phoenix-and-react-pt-4/">Front-end for sign up with React and Redux</a></li>
    <li><a href="/blog/2016/01/18/trello-tribute-with-phoenix-and-react-pt-5/">Database seeding and sign in controller</a></li>
    <li><a href="/blog/2016/01/20/trello-tribute-with-phoenix-and-react-pt-6/">Front-end authentication with React and Redux</a></li>
    <li><a href="/blog/2016/01/25/trello-tribute-with-phoenix-and-react-pt-7/">Sockets and channels</a></li>
    <li><a href="/blog/2016/01/28/trello-tribute-with-phoenix-and-react-pt-8/">Listing and creating boards</a></li>
    <li><a href="/blog/2016/02/04/trello-tribute-with-phoenix-and-react-pt-9/">Adding new board members</a></li>
    <li><a href="/blog/2016/02/15/trello-tribute-with-phoenix-and-react-pt-10/">Tracking connected board members</a></li>
    <li><a href="/blog/2016/02/24/trello-tribute-with-phoenix-and-react-pt-11/">Adding lists and cards</a></li>
    <li><a href="/blog/2016/03/04/trello-tribute-with-phoenix-and-react-pt-12/">Deploying our application on Heroku</a></li>
  </ol>

  <a href="https://phoenix-trello.herokuapp.com/"><i class="fa fa-cloud"></i> Live demo</a> |
  <a href="https://github.com/bigardone/phoenix-trello"><i class="fa fa-github"></i> Source code</a>
</div>

## User sign up
In the [last post][86bf21e1] we created the ```User``` model with its validations
and the necessary changeset transformation to generate the encrypted password,
we also updated our router file and created the ```RegistrationController``` where a
new user request is handled and returns the user in **JSON** and its **jwt** token for
authenticating future requests. Now let's move on to the front-end side.

### Preparing the React router
The main goal is to have two public routes, ```/sign_in``` and ```/sign_up```, which
any visitor is going to be able to visit in order to log into the application
or register a new user account.

On the other hand we are going to need a ```/```
as the root route to display all the boards belonging to the user and finally a ```/boards/:id```
route to display the selected board by the user. To access these last two routes, the
user must be authenticated, otherwise we'll redirect him to the registration screen.

So let's update the **react-router** ```routes``` file to represent this:

```javascript
// web/static/js/routes/index.js

import { IndexRoute, Route }        from 'react-router';
import React                        from 'react';
import MainLayout                   from '../layouts/main';
import AuthenticatedContainer       from '../containers/authenticated';
import HomeIndexView                from '../views/home';
import RegistrationsNew             from '../views/registrations/new';
import SessionsNew                  from '../views/sessions/new';
import BoardsShowView               from '../views/boards/show';

export default (
  <Route component={MainLayout}>
    <Route path="/sign_up" component={RegistrationsNew} />
    <Route path="/sign_in" component={SessionsNew} />

    <Route path="/" component={AuthenticatedContainer}>
      <IndexRoute component={HomeIndexView} />

      <Route path="/boards/:id" component={BoardsShowView} />
    </Route>
  </Route>
);
```

The tricky part is the ```AuthenticatedContainer```, let's take a look at it:

```javascript
// web/static/js/containers/authenticated.js

import React        from 'react';
import { connect }  from 'react-redux';
import { routeActions } from 'redux-simple-router';

class AuthenticatedContainer extends React.Component {
  componentDidMount() {
    const { dispatch, currentUser } = this.props;

    if (localStorage.getItem('phoenixAuthToken')) {
      dispatch(Actions.currentUser());
    } else {
      dispatch(routeActions.push('/sign_up'));
    }
  }

  render() {
    // ...
  }
}

const mapStateToProps = (state) => ({
  currentUser: state.session.currentUser,
});

export default connect(mapStateToProps)(AuthenticatedContainer);

```

What we basically do here is, when the component mounts, check if the **jwt**
token is present in the browser's local storage. Later on we will see how
to set it, but for now let's just imagine that it doesn't exist, so thanks to the
**redux-simple-router** library we will redirect the user to the sign up page.

### The sign up view component
This is what we will render to the user once we detect that he is not authenticated:

```javascript
// web/static/js/views/registrations/new.js

import React, {PropTypes}   from 'react';
import { connect }          from 'react-redux';
import { Link }             from 'react-router';

import { setDocumentTitle, renderErrorsFor } from '../../utils';
import Actions              from '../../actions/registrations';

class RegistrationsNew extends React.Component {
  componentDidMount() {
    setDocumentTitle('Sign up');
  }

  _handleSubmit(e) {
    e.preventDefault();

    const { dispatch } = this.props;

    const data = {
      first_name: this.refs.firstName.value,
      last_name: this.refs.lastName.value,
      email: this.refs.email.value,
      password: this.refs.password.value,
      password_confirmation: this.refs.passwordConfirmation.value,
    };

    dispatch(Actions.signUp(data));
  }

  render() {
    const { errors } = this.props;

    return (
      <div className="view-container registrations new">
        <main>
          <header>
            <div className="logo" />
          </header>
          <form onSubmit={::this._handleSubmit}>
            <div className="field">
              <input ref="firstName" type="text" placeholder="First name" required={true} />
              {renderErrorsFor(errors, 'first_name')}
            </div>
            <div className="field">
              <input ref="lastName" type="text" placeholder="Last name" required={true} />
              {renderErrorsFor(errors, 'last_name')}
            </div>
            <div className="field">
              <input ref="email" type="email" placeholder="Email" required={true} />
              {renderErrorsFor(errors, 'email')}
            </div>
            <div className="field">
              <input ref="password" type="password" placeholder="Password" required={true} />
              {renderErrorsFor(errors, 'password')}
            </div>
            <div className="field">
              <input ref="passwordConfirmation" type="password" placeholder="Confirm password" required={true} />
              {renderErrorsFor(errors, 'password_confirmation')}
            </div>
            <button type="submit">Sign up</button>
          </form>
          <Link to="/sign_in">Sign in</Link>
        </main>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  errors: state.registration.errors,
});

export default connect(mapStateToProps)(RegistrationsNew);
```

Not very much to say about this component... it changes the document's
title when it mounts,  it also renders the sign up form and dispatches the result
of the ```signUp``` registration action creator.

### The action creator
When the previous form is submitted we want to send the data to the server where it will
be processed:

```javascript
// web/static/js/actions/registrations.js

import { pushPath }  from 'redux-simple-router';
import Constants     from '../constants';
import { httpPost }  from '../utils';

const Actions = {};

Actions.signUp = (data) => {
  return dispatch => {
    httpPost('/api/v1/registrations', {user: data})
    .then((data) => {
      localStorage.setItem('phoenixAuthToken', data.jwt);

      dispatch({
        type: Constants.CURRENT_USER,
        currentUser: data.user,
      });

      dispatch(pushPath('/'));
    })
    .catch((error) => {
      error.response.json()
      .then((errorJSON) => {
        dispatch({
          type: Constants.REGISTRATIONS_ERROR,
          errors: errorJSON.errors,
        });
      });
    });
  };
};

export default Actions;

```

When the ```RegistrationsNew``` component calls this action creator passing the form data,
a new **POST** request is sent to the server. The request is filtered by **Phoenix**'s router and processed by the ```RegistrationController``` we previously created in the [previous blog post](https://blog.diacode.com/trello-clone-with-phoenix-and-react-pt-3). If the result is successful
then the returned ```jwt``` token is stored into the ```localStorage```, the
created user data is dispatched in the ```CURRENT_USER``` action and it finally
  redirects the user to the root path. On the contrary, if there is any error related
to the registration data, it will dispatch ```REGISTRATIONS_ERROR``` action with the errors
so we can show them in the form to the user.

For these http requests we are going to lean on the [isomorphic-fetch][316fbbc4] package used from our utility file which includes some helpers for this purpose:

```javascript
// web/static/js/utils/index.js

import React        from 'react';
import fetch        from 'isomorphic-fetch';
import { polyfill } from 'es6-promise';

export function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  } else {
    var error = new Error(response.statusText);
    error.response = response;
    throw error;
  }
}

export function parseJSON(response) {
  return response.json();
}

export function httpPost(url, data) {
  const headers = {
    Authorization: localStorage.getItem('phoenixAuthToken'),
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  const body = JSON.stringify(data);

  return fetch(url, {
    method: 'post',
    headers: headers,
    body: body,
  })
  .then(checkStatus)
  .then(parseJSON);
}

// ...

```


### The reducers

The final step is to handle these actions results with the reducers so that we can create the
new state tree the application needs. First let's take a look to the ```session```
reducer where the ```currentUser``` is going to be set:

```javascript
// web/static/js/reducers/session.js

import Constants from '../constants';

const initialState = {
  currentUser: null,
};

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case Constants.CURRENT_USER:
      return { ...state, currentUser: action.currentUser };

    default:
      return state;
  }
}

```

In case there is any kind of registration errors we also need to update the new
state with them so they can be displayed to the user. Let's add them in the ```registration``` reducer:


```javascript
// web/static/js/reducers/registration.js


import Constants from '../constants';

const initialState = {
  errors: null,
};

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case Constants.REGISTRATIONS_ERROR:
      return {...state, errors: action.errors};

    default:
      return state;
  }
}
```

Note that for displaying the errors we are calling the ```renderErrorsFor```
function from the utils file:

```javascript
// web/static/js/utils/index.js

// ...

export function renderErrorsFor(errors, ref) {
  if (!errors) return false;

  return errors.map((error, i) => {
    if (error[ref]) {
      return (
        <div key={i} className="error">
          {error[ref]}
        </div>
      );
    }
  });
}
```

And that's all for the registration process. In the next post we will see how
existing users can authenticate into the application and have access to their
private stuff. Meanwhile, don't forget to check out the live demo and final source code:

<div class="btn-wrapper">
  <a href="https://phoenix-trello.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-trello" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

Happy coding!





  [86bf21e1]: /blog/2016/01/12/trello-tribute-with-phoenix-and-react-pt-3 "Part 3"
  [316fbbc4]: https://github.com/matthew-andrews/isomorphic-fetch "Isomorphic fetch package"

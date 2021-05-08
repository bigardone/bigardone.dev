---
title: Trello tribute with Phoenix and React (pt.6)
date: 2016-01-20 23:53 PST
tags: elixir, phoenix, react, redux
canonical: https://blog.diacode.com/trello-clone-with-phoenix-and-react-pt-6
published: true
excerpt:
  Handling user authentication from the front-end with React and Redux.
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

## User sign in front-end

Now that the [back-end functionality][c0a8e4d0] is ready to handle sign in requests
let's move on to the front-end and see how to build and send these requests and how to
use the returned data to allow the user access to private routes.

### The routes files

Before continuing let's take a look again at our
React routes file:

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
import CardsShowView               from '../views/cards/show';

export default (
  <Route component={MainLayout}>
    <Route path="/sign_up" component={RegistrationsNew} />
    <Route path="/sign_in" component={SessionsNew} />

    <Route path="/" component={AuthenticatedContainer}>
      <IndexRoute component={HomeIndexView} />

      <Route path="/boards/:id" component={BoardsShowView}>
        <Route path="cards/:id" component={CardsShowView}/>
      </Route>
    </Route>
  </Route>
);

```

As we saw in [part 4][d3ecc194], the ```AuthenticatedContainer``` is going to prevent
unauthenticated users from accessing the boards views unless the **jwt** token
returned from the sign in process is present and valid.

### The view component

Now we need to create the ```SessionsNew```
component where the sign in form will be rendered:

```javascript
import React, {PropTypes}   from 'react';
import { connect }          from 'react-redux';
import { Link }             from 'react-router';

import { setDocumentTitle } from '../../utils';
import Actions              from '../../actions/sessions';

class SessionsNew extends React.Component {
  componentDidMount() {
    setDocumentTitle('Sign in');
  }

  _handleSubmit(e) {
    e.preventDefault();

    const { email, password } = this.refs;
    const { dispatch } = this.props;

    dispatch(Actions.signIn(email.value, password.value));
  }

  _renderError() {
    const { error } = this.props;

    if (!error) return false;

    return (
      <div className="error">
        {error}
      </div>
    );
  }

  render() {
    return (
      <div className='view-container sessions new'>
        <main>
          <header>
            <div className="logo" />
          </header>
          <form onSubmit={::this._handleSubmit}>
            {::this._renderError()}
            <div className="field">
              <input ref="email" type="Email" placeholder="Email" required="true" defaultValue="john@phoenix-trello.com"/>
            </div>
            <div className="field">
              <input ref="password" type="password" placeholder="Password" required="true" defaultValue="12345678"/>
            </div>
            <button type="submit">Sign in</button>
          </form>
          <Link to="/sign_up">Create new account</Link>
        </main>
      </div>
    );
  }
}

const mapStateToProps = (state) => (
  state.session
);

export default connect(mapStateToProps)(SessionsNew);
```

It basically renders the form and calls the ```signIn```action creator when submitting
it. It will also be connected to the store to get its props which will be updated
through the session reducer, so we can display validation errors to the user.

### The action creator

Following the user's interaction flow, let's create the sessions action creator:

```javascript
// web/static/js/actions/sessions.js

import { routeActions }                   from 'redux-simple-router';
import Constants                          from '../constants';
import { Socket }                         from 'phoenix';
import { httpGet, httpPost, httpDelete }  from '../utils';

function setCurrentUser(dispatch, user) {
  dispatch({
    type: Constants.CURRENT_USER,
    currentUser: user,
  });

  // ...
};

const Actions = {
  signIn: (email, password) => {
    return dispatch => {
      const data = {
        session: {
          email: email,
          password: password,
        },
      };

      httpPost('/api/v1/sessions', data)
      .then((data) => {
        localStorage.setItem('phoenixAuthToken', data.jwt);
        setCurrentUser(dispatch, data.user);
        dispatch(routeActions.push('/'));
      })
      .catch((error) => {
        error.response.json()
        .then((errorJSON) => {
          dispatch({
            type: Constants.SESSIONS_ERROR,
            error: errorJSON.error,
          });
        });
      });
    };
  },

  // ...
};

export default Actions;

```

The ```signIn``` function will make a ```POST``` request sending as parameters the ```email```
and ```password``` previously provided by the user. If the authentication on the back-end is
successful then it will store the returned ```jwt``` token in the ```localStorage```
and dispatch the ```currentUser``` **JSON** to the store. If, for any reason, there's a error
authenticating the user, it will instead dispatch the errors so we can display them in the sign in form.


### The reducer

Now let's create the ```session``` reducer:

```javascript
// web/static/js/reducers/session.js

import Constants from '../constants';

const initialState = {
  currentUser: null,
  error: null,
};

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case Constants.CURRENT_USER:
      return { ...state, currentUser: action.currentUser, error: null };

    case Constants.SESSIONS_ERROR:
      return { ...state, error: action.error };

    default:
      return state;
  }
}

```

Not very much to say about it as it's quite self-explanatory so let's modify the ```authenticated```
container so it's aware of the new state:

### The authenticated container

```javascript
// web/static/js/containers/authenticated.js

import React            from 'react';
import { connect }      from 'react-redux';
import Actions          from '../actions/sessions';
import { routeActions } from 'redux-simple-router';
import Header           from '../layouts/header';

class AuthenticatedContainer extends React.Component {
  componentDidMount() {
    const { dispatch, currentUser } = this.props;
    const phoenixAuthToken = localStorage.getItem('phoenixAuthToken');

    if (phoenixAuthToken && !currentUser) {
      dispatch(Actions.currentUser());
    } else if (!phoenixAuthToken) {
      dispatch(routeActions.push('/sign_in'));
    }
  }

  render() {
    const { currentUser, dispatch } = this.props;

    if (!currentUser) return false;

    return (
      <div className="application-container">
        <Header
          currentUser={currentUser}
          dispatch={dispatch}/>

        <div className="main-container">
          {this.props.children}
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  currentUser: state.session.currentUser,
});

export default connect(mapStateToProps)(AuthenticatedContainer);

```

When this component gets mounted, if there is an authentication token but not a ```currentUser```
in the store, it will call the ```currentUser``` action creator to retrieve the
user's data from the back-end. Let's add it:

```javascript
// web/static/js/actions/sessions.js
// ...

const Actions = {
  // ...

  currentUser: () => {
    return dispatch => {
      httpGet('/api/v1/current_user')
      .then(function(data) {
        setCurrentUser(dispatch, data);
      })
      .catch(function(error) {
        console.log(error);
        dispatch(routeActions.push('/sign_in'));
      });
    };
  },

  // ...
}

// ...
```

This gets us covered if the user reloads the
browser or he just visits the root url again without signing out before. Following our
previous steps, after signing the user and setting the ```currentUser``` in the state,
the component will render normally displaying the header component and its nested
children routes.


### The header component
This component will render the user's gravatar and name along with the link to
the boards url and the sign out button.

```javascript
// web/static/js/layouts/header.js

import React          from 'react';
import { Link }       from 'react-router';
import Actions        from '../actions/sessions';
import ReactGravatar  from 'react-gravatar';

export default class Header extends React.Component {
  constructor() {
    super();
  }

  _renderCurrentUser() {
    const { currentUser } = this.props;

    if (!currentUser) {
      return false;
    }

    const fullName = [currentUser.first_name, currentUser.last_name].join(' ');

    return (
      <a className="current-user">
        <ReactGravatar email={currentUser.email} https /> {fullName}
      </a>
    );
  }

  _renderSignOutLink() {
    if (!this.props.currentUser) {
      return false;
    }

    return (
      <a href="#" onClick={::this._handleSignOutClick}><i className="fa fa-sign-out"/> Sign out</a>
    );
  }

  _handleSignOutClick(e) {
    e.preventDefault();

    this.props.dispatch(Actions.signOut());
  }

  render() {
    return (
      <header className="main-header">
        <nav>
          <ul>
            <li>
              <Link to="/"><i className="fa fa-columns"/> Boards</Link>
            </li>
          </ul>
        </nav>
        <Link to='/'>
          <span className='logo'/>
        </Link>
        <nav className="right">
          <ul>
            <li>
              {this._renderCurrentUser()}
            </li>
            <li>
              {this._renderSignOutLink()}
            </li>
          </ul>
        </nav>
      </header>
    );
  }
}

```

When the user clicks the sign out button it calls the ```signOut``` method of the ```session```
action creator. Let's add it then:

```javascript
// web/static/js/actions/sessions.js
// ...

const Actions = {
  // ...

  signOut: () => {
    return dispatch => {
      httpDelete('/api/v1/sessions')
      .then((data) => {
        localStorage.removeItem('phoenixAuthToken');

        dispatch({
          type: Constants.USER_SIGNED_OUT,
        });

        dispatch(routeActions.push('/sign_in'));
      })
      .catch(function(error) {
        console.log(error);
      });
    };
  },

  // ...
}

// ...
```

It will send a ```DELETE``` request against the back-end and, when successful, it
will remove the ```phoenixAuthToken``` from the ```localStorage``` and dispatch the ```USER_SIGNED_OUT```
action reseting the ```currentUser``` from the state using the previously defined
session reducer:

```javascript
// web/static/js/reducers/session.js

import Constants from '../constants';

const initialState = {
  currentUser: null,
  error: null,
};

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    // ...

    case Constants.USER_SIGNED_OUT:
      return initialState;

    // ...
  }
}

```

### One more thing
Although we are done with the user sign in process, there is a crucial functionality
we haven't implemented yet, which is going to be the core of all the future features
we will code: **the user socket and its channels**. It's so important that I'd rather
prefer leaving it for the next post where we will see how the ```UserSocket``` looks like and
how to connect to it so we can have bidirectional channels between our front-end and
the back-end, displaying changes to the user in realtime. Meanwhile, don't forget to check out the live
demo and final source code:

<div class="btn-wrapper">
  <a href="https://phoenix-trello.herokuapp.com/" target="_blank" class="btn"><i class="fa fa-cloud"></i> Live demo</a>
  <a href="https://github.com/bigardone/phoenix-trello" target="_blank" class="btn"><i class="fa fa-github"></i> Source code</a>
</div>

Happy coding!


  [c0a8e4d0]: /blog/2016/01/18/trello-tribute-with-phoenix-and-react-pt-5.html.markdown "Part 5"
  [d3ecc194]: /blog/2016/01/14/trello-tribute-with-phoenix-and-react-pt-4/ "Part 4"

import React from 'react';
import { SetState } from './lib/Utilities';

import MainPage from './lib/components/mainContent/MainPage';
import LoginPage from './lib/components/LoginPage';
import FrontPage from './lib/components/FrontPage';
import SignupPage from './lib/components/SignupPage';

import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import './styles/app.css';

function App({}): JSX.Element {
    let getRatio = () => window.innerHeight/window.innerWidth
    let [ratio, setRatio]: [number, SetState<number>] = React.useState(getRatio());

    window.addEventListener("resize", () => setRatio(getRatio()));

    return (
        <Router>
            <Switch>
                <Route path="/login" component={LoginPage}/>
                <Route path="/signup" component={SignupPage}/>
                <Route path="/front" component={FrontPage}/>
                <Route path="/*" component={MainPage}/>
            </Switch>
        </Router>
    );
}

export default App;

import React from 'react';
import { Dispatch, PageState,PageAction } from '../../Utilities';
import RatingsPage from './RatingsPage';
import RatePage from './RatePage';
import PartnerPage from './PartnerPage';

import Icons from '../../Icons';
import UserObject from '../../UserObject';
import { Route, Redirect, Switch, useHistory, useLocation, match as RouterMatch } from 'react-router-dom';

function MainPageNav(
            {name, icon}: 
            {name: string, icon: JSX.Element}
        ){
    let route = `/${name}`;
    let location = useLocation();
    let history = useHistory();

    const selected = () => location.pathname.startsWith(route);
    return (
        <div 
            className={'mainPageNav col centerAll clickable '+(selected() ? 'selected' : '')} 
            onClick={()=>history.push(route)}
        >
            {icon}
            <p>{name}</p>
        </div>
    );
}

var pages: {[key: string]: JSX.Element} = {};

function MainPage({match}: {match: RouterMatch}){
    console.log('match object:', match);
    let history = useHistory();

    React.useEffect((): void=>{
        if (!UserObject.isLoggedIn()) {
            history.push('/front');
        } else {
            history.push('/ratings')
        }

    }, []);

    return (!UserObject.isLoggedIn()) ? <Redirect to="/front" /> : (
        <div id='mainPage' className='col'>
            <header className='row centerCross'>
                <h1>Finding <span>Name</span>o</h1>
                {Icons.CogIcon}
            </header>
            <section id='mainContent'>
                <Switch>
                    <Route path="/ratings" exact component={RatingsPage}/>
                    <Route path="/partner" exact component={PartnerPage}/>
                    <Route path="/rate" exact component={RatePage}/>
                    <Route path="/rate/:name/isMale/:isMale" exact component={RatePage}/>
                </Switch>
            </section>
            <footer className='row spaceEvenly centerAll'>
                <MainPageNav name='ratings' icon={Icons.RatingsIcon} />
                <MainPageNav name='partner' icon={Icons.PartnerIcon} />
                <MainPageNav name='rate' icon={Icons.RateIcon}/>
            </footer>
        </div>
    );
}

export default MainPage;
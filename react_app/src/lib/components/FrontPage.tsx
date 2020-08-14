import React from 'react';
import {isMobile, SetState} from '../Utilities';
import Icons from '../Icons';
import { Link } from 'react-router-dom';

function FrontPage({setPage}: {setPage: SetState<string>}){

    return <div id='frontPage' className='col'>
        <div id='logoContainer' className="row centerAll centerCross">
            {Icons.Logo}
            {/*Leaves*/}
        </div>
        <div id='bottomHalf'>
            <div id='heading' className={(isMobile() ? 'col' : 'row') + ' center'}>
                <h1>Finding</h1>
                <h1><span>Name</span>o</h1>
            </div>
            <div id='buttons' className="row center">
                <Link to='/login'>
                    <button id='login'>login</button>
                </Link>
                <Link to='/signup'>
                    <button id='signup'>sign up</button>
                </Link>
            </div>
        </div>
    </div>;
}

export default FrontPage;
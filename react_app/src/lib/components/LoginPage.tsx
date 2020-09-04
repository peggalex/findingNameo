import React from 'react'
import {SetState, hash, waitForAjaxCall} from '../Utilities';
import Icons from '../Icons';
import UserObject from '../UserObject';
import { useHistory, Link } from 'react-router-dom';
import { myPushSub } from '../pushNotifications';

function LoginPage(){

    let history = useHistory();

    const login = async (e: any): Promise<boolean> => {
        e.preventDefault();

        let form: HTMLFormElement = e.target;
        let username: string = form.username.value;
        let passwordHashed: string = await hash(form.password.value);
        let isLoggedIn: boolean = false;

        try {
            let loginEndpoint = `
                /login/${username}
                /password/${passwordHashed}
            `;
            console.log('myPushSub', myPushSub); //TODO: remove
            if (myPushSub !== undefined){
                let { endpoint, keys: {p256dh, auth } }:{ 
                    endpoint: string, 
                    keys: {
                        p256dh: string, 
                        auth: string
                    } 
                } = JSON.parse(JSON.stringify(myPushSub));
                loginEndpoint += `
                    /endpoint/${encodeURIComponent(endpoint)}
                    /p256dh/${encodeURIComponent(p256dh)}
                    /auth/${encodeURIComponent(auth)}
                `;
                console.log(loginEndpoint);
            }
            await waitForAjaxCall('get', loginEndpoint);
            isLoggedIn = true;
        } catch {
            alert("login failed.");
        }
        if (isLoggedIn) {
            UserObject.set(username, passwordHashed);
            console.log(UserObject.isLoggedIn());
            history.push('/');
        }

        return false;
    }

    return <form id='loginPage' method="post" className='col centerCross' onSubmit={login}>
        <h1>Login</h1>

        <label htmlFor='username'>username</label>
        <input name='username' type="text" pattern="[\dA-z_]{1,20}" title="Alphanumeric and underscores." required></input>

        <label htmlFor='password'>password</label>
        <input name='password' type='password' required></input>

        <div id='logoContainer' className="row center centerCross">
            {Icons.Logo}
        </div>

        <div id='buttons' className="row center">
            <Link to='/front'>
                <button id='back' type="button">back</button>
            </Link>
            <button id='login' type="submit">login</button>
        </div>

    </form>;
}

export default LoginPage;
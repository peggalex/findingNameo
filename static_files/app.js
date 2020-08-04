var isMobile = () => window.matchMedia("(orientation: portrait)").matches;

const enc = new TextEncoder();

function arrayBufferToHex(arrayBuffer){
    let intArray = new Uint8Array(arrayBuffer),
        hashArray = Array.from(intArray),
        hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
}

async function hash(toHash){
    // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
    let hashEnc = enc.encode(toHash),                        				  
        hashBuffer = await crypto.subtle.digest('SHA-512', hashEnc),
        keyHex = arrayBufferToHex(hashBuffer);

    return keyHex;
}

function alertError(xhr, status, error) {
    alert(`${error}: ${xhr.responseText}`);
}  

async function waitForAjaxCall(method, url) {
    url = url.replace(/[ \t\n]/g, ''); // get rid of empty spaces and newlines
  
    return new Promise((resolve, reject) => $.ajax({
      method: method,
      url: url
    }).done(resolve).fail((data, _, error) => {
      reject(alertError(data, _, error));
    }));
}

function isMaleStr(isMale){
    switch (isMale){
        case -1: 
            return 'unisex';
        case 0:
            return 'girl';
        case 1:
            return 'boy';
        default:
            throw new Error('isMale must be an int in {-1,0,1}.');
    }
}

function genderStr(isMale){
    switch (isMale){
        case -1: 
            return 'unisex';
        case 0:
            return 'female';
        case 1:
            return 'male';
        default:
            throw new Error('genderStr be an int in {-1,0,1}.');
    }
}

function getNumberSuffix(number){
    switch (parseInt(number)){
        case 1:
            return "st";

        case 2:
            return "nd";

        case 3:
            return "rd";

        default:
            return "th";
    }
}

const avg = (x1, x2) => ((parseFloat(x1)+parseFloat(x2))/2).toFixed(1);

class UserObject {
    static instance = new UserObject(); // singleton
    
    static set(username, password){
        UserObject.instance.username = username;
        UserObject.instance.password = password;
    }

    static getUsername = () => UserObject.instance.username;
    static getPassword = () => UserObject.instance.password;

}

function App({}){
    let getRatio = () => window.innerHeight/window.innerWidth
    let [ratio, setRatio] = React.useState(getRatio());

    window.addEventListener("resize", () => setRatio(getRatio()));

    let [page, setPage] = React.useState("frontPage");

    let pages = {
        frontPage: <FrontPage setPage={setPage}/>,
        loginPage: <LoginPage setPage={setPage}/>,
        signupPage: <SignupPage setPage={setPage}/>,
        mainPage: <MainPage setPage={setPage}/>
    }

    return pages[page];

}

function FrontPage({setPage}){

    return <div id='frontPage' className='col'>
        <div id='logoContainer' className="row centerAll centerCross">
            {Logo}
            {/*Leaves*/}
        </div>
        <div id='bottomHalf'>
            <div id='heading' className={(isMobile() ? 'col' : 'row') + ' center'}>
                <h1>Finding</h1>
                <h1><span>Name</span>o</h1>
            </div>
            <div id='buttons' className="row center">
                <button onClick={()=>setPage('loginPage')} id='login'>login</button>
                <button onClick={()=>setPage('signupPage')} id='signup'>sign up</button>
            </div>
        </div>
    </div>;
}

function LoginPage({setPage}){

    const login = async (e) => {
        e.preventDefault();

        let form = e.target;
        let username = form.username.value;
        let passwordHashed = await hash(form.password.value);
        let isLoggedIn = false;
        try {
            await waitForAjaxCall('get', `
                /login/${username}
                /password/${passwordHashed}
            `);
            isLoggedIn = true;
        } catch {
            alert("login failed.");
        }
        if (isLoggedIn) {
            UserObject.set(username, passwordHashed);
            setPage("mainPage");
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
            {Logo}
        </div>

        <div id='buttons' className="row center">
            <button onClick={()=>setPage('frontPage')} id='back' type="button">back</button>
            <button id='login' type="submit">login</button>
        </div>

    </form>;
}

function SignupPage({setPage}){

    let formRef = React.useRef();

    const validate = () => {
        let form = formRef.current;
        if (form.password.value !== form.password2.value){
            form.password2.setCustomValidity("passwords must match.");
            return false;
        } else {
            form.password2.setCustomValidity('');
        }
    }

    const signup = async (e) => {
        e.preventDefault();

        let form = formRef.current;
        let passwordHashed = await hash(form.password.value);
        try {
            await waitForAjaxCall('put', `
                /register/${form.username.value}
                /nickname/${form.nickname.value}
                /password/${passwordHashed}
            `);
            setPage('loginPage');
            alert("register successful!");
        } catch {
            alert("register failed.");
        }

        return false;
    }

    return <form id='signupPage' onSubmit={signup} method='post' className='col centerCross' ref={formRef}>
        <h1>Signup</h1>

        <label htmlFor='username'>username</label>
        <input name='username' type="text" pattern="[\dA-z_]{1,20}" title="Alphanumeric and underscores." required></input>

        <label htmlFor='nickname'>nickname</label>
        <input name='nickname' type="text" pattern="[\dA-z_ ]+" title="Alphanumeric, underscores and spaces." required></input>

        <label htmlFor='password'>password</label>
        <input name='password' type='password' required></input>

        <label htmlFor='password2'>retype password</label>
        <input name='password2' type='password' required></input>

        <div className='spacer'></div>

        <div id='buttons' className="row center">
            <button onClick={()=>setPage('frontPage')} id='back' type="button">back</button>
            <button onClick={validate} id='signup' type="submit">signup</button>
        </div>

    </form>;
}

function PersonRating({isYou, rating}){
    return (
        <div className={(isYou ? 'you' : 'partner')+'Rating personRating'}>
            <p>{rating}</p>
            <p>{isYou ? 'you' : 'partner'}</p>
        </div>
    );
}

function MainPageNav({name, icon, state, dispatch}){
    const selected = () => state.pageName==name+'Page';
    return (
        <div 
            className={'mainPageNav col centerAll clickable '+(selected() ? 'selected' : '')} 
            onClick={()=>dispatch({
                type: 'named',
                pageName: name+'Page'
            })}
        >
            {icon}
            <p>{name}</p>
        </div>
    );
}

var pages;

function MainPage({setPage}){

    let [state, dispatch] = React.useReducer((state, action)=>{
        switch (action.type){
            case 'named':
                return {
                    pageName: action.pageName, 
                    page: pages[action.pageName]
                }

            case 'element':
                return {
                    pageName: action.pageName,
                    page: action.element
                }

            default:
                throw new Error('bad reducer action type.');
        }
    }, {pageName: '', page: null});

    React.useEffect(()=>{
        //runs once after first render pass (componentDidMount) iff diff = []
        pages = {
            ratingsPage: <RatingsPage dispatch={dispatch}/>,
            ratePage: <RatePage dispatch={dispatch}/>
        }
        dispatch({type: 'named', pageName: 'ratingsPage'});
    }, []);

    return (
        <div id='mainPage' className='col'>
            <header className='row centerCross'>
                <h1>Finding <span>Name</span>o</h1>
                {CogIcon}
            </header>
            <section id='mainContent'>
                {state.page}
            </section>
            <footer className='row spaceEvenly centerAll'>
                <MainPageNav name='ratings' icon={RatingsIcon} state={state} dispatch={dispatch}/>
                <MainPageNav name='partner' icon={PartnerIcon} state={state} dispatch={dispatch}/>
                <MainPageNav name='rate' icon={RateIcon} state={state} dispatch={dispatch}/>
            </footer>
        </div>
    );
}

class Rate {
    constructor(name){
        Object.assign(this, name);
    }

    static async getRandomRate(gender){
        // gender in {any, male, female, unisex}
        return new Rate(await waitForAjaxCall('get', `
            randomName/${UserObject.getUsername()}
            /password/${UserObject.getPassword()}
            /gender/${gender}
        `));

    }
}

function Rating({dispatch, nameObj}){

    let {name, isMale, rank, myRating, partnerRating} = nameObj;
        
    let popSuffix = getNumberSuffix(rank);
    const goToRate = () => {
        dispatch({
            type: 'element',
            pageName: 'ratePage',
            element: <RatePage nameObj={nameObj} />
        });
    }

    return (
        <div className='itsARate row centerCross clickable' onClick={goToRate}>
            <div className={'col center gender '+isMaleStr(isMale)}>
                <p>{isMaleStr(isMale)}</p>
            </div>
            <div className='genderPlaceholder'></div>
            <div className='namePop'>
                <p className={'name '+(name.length > 7 ? 'long':'')}>{name}</p>
                <div className='row'>
                    <p className='popLabel'>popularity</p>
                    <p className='pop'>{rank}</p>
                    <p className={popSuffix + ' popSuffix'}></p>
                </div>
            </div>
            <div className='spacer'></div>
            {StarIcon}
            <p className='rating'>{avg(myRating, partnerRating)}</p>
            <div className='partnerRatings'>
                <PersonRating rating={myRating.toFixed(1)} isYou={true}/>
                <PersonRating rating={partnerRating.toFixed(1)} isYou={false}/>
            </div>
        </div>
    );
}

const GetRatingFilterIcon = (str) => {
    let dic = {
        desc: ArrowDownIcon,
        asc: ArrowUpIcon
    }
    return dic[str] ? dic[str] : <p className='ratingFilterIcon centerAll'>{str}</p>;
}

function RatingsFilterOption({filterName, subFilterElements, filterObj: {filter, subFilter, setFilter, setSubFilter}}){

    const isSelected = () => filter==filterName;

    let [subFilterIndex, setSubFilterIndex] = React.useState(
        isSelected() ? subFilterElements.indexOf(subFilter) : 0
    );

    const nextIndex = () => {
        if (isSelected()){
            console.log('isSelected', 'filter:', filter, 'filterName', filterName);
            let newIndex = (subFilterIndex + 1) % subFilterElements.length;
            setSubFilterIndex(newIndex);
            setSubFilter(subFilterElements[newIndex]);
        } else {
            console.log('!isSelected', 'filter:', filter, 'filterName', filterName);
            setFilter(filterName);
            setSubFilter(subFilterElements[subFilterIndex]);
        }
    }

    return (
        <div 
            className={'filterOption row centerCross clickable '+(isSelected() ? 'selected':'')} 
            onClick={nextIndex}
        >
            <p className='filterName'>{filterName}</p>
            <div className='spacer'></div>
            <div className='subfilterOptionIcon'>
                {GetRatingFilterIcon(subFilterElements[subFilterIndex])}
            </div>
        </div>
    );
}

function RatingsFilter({filterObj}){

    return (
        <div id='ratingsFilter'>
            <RatingsFilterOption 
                filterName='name' 
                subFilterElements={['asc', 'desc']}
                filterObj={filterObj}
            />
            <RatingsFilterOption 
                filterName='popularity' 
                subFilterElements={['asc', 'desc']} 
                filterObj={filterObj}
            />
            <RatingsFilterOption 
                filterName='avg rating' 
                subFilterElements={['asc', 'desc']} 
                filterObj={filterObj}
            />
            <RatingsFilterOption 
                filterName='my rating' 
                subFilterElements={['asc', 'desc']} 
                filterObj={filterObj}
            />
            <RatingsFilterOption 
                filterName='partner rating' 
                subFilterElements={['asc', 'desc']} 
                filterObj={filterObj}
            />
            <RatingsFilterOption 
                filterName='gender' 
                subFilterElements={['male', 'female', 'unisex']} 
                filterObj={filterObj}
            />
        </div>
    );
}

const ResultsAtATime = 10;

function RatingsPage({dispatch}){

    let searchRef = React.useRef(null);

    let [ratings, setRatings] = React.useState([]);
    let [isMore, setIsMore] = React.useState(false);

    let getRatingsSetIsMore = async (filter, subFilter, range, rangeStart) => {

        let {ratings, isMore} = await waitForAjaxCall('get', `
            /ratings/${UserObject.getUsername()}
            /password/${UserObject.getPassword()}
            /filter/${filter}
            /subFilter/${subFilter}
            /range/${range}
            /rangeStart/${rangeStart}
            /search/${searchRef.current ? searchRef.current.value : ''}
        `);

        setIsMore(isMore);
        return ratings;
    }

    let [showSettings, setShowSettings] = React.useState(false);
    let [filter, setFilter] = React.useState('popularity');
    let [subFilter, setSubFilter] = React.useState('asc');

    React.useEffect(()=>{
        getRatingsSetIsMore(filter, subFilter, ResultsAtATime, 0).then(setRatings);
    }, [filter, subFilter])

    let filterObj = {filter, subFilter, setFilter, setSubFilter}; //todo: turn into useContext

    let showMoreButton = <button id='showMoreButton' type='button' onClick={
        async () => {
            let scrollPos = $('#mainContent').scrollTop();
            let newRatings = await getRatingsSetIsMore(filter, subFilter, ResultsAtATime, ratings.length)
            setRatings(ratings.concat(newRatings));
            $('#mainContent').scrollTop(scrollPos);
        }
    }>show more</button>;

    return (
        <div id='ratingsPage'>
            <div>
                <div id='filter' className='row centerCross'>
                    <div id='filterButton' className={'clickable' + (showSettings ? 'selected' : '')} onClick={()=>setShowSettings(!showSettings)}>
                        {FilterIcon}
                    </div>
                    <div id='filterPill' className='row centerCross'>
                        <p id='filterPillName' className='centerAll'>{filter}</p>
                        {GetRatingFilterIcon(subFilter)}
                    </div>
                    <div className='spacer'></div>
                    <input ref={searchRef} onChange={()=>getRatingsSetIsMore(filter, subFilter, ResultsAtATime, 0).then(setRatings)}></input>
                    {SearchIcon}
                </div>
            </div>
            <div id='ratingsTableContainer' className='col'>
                {showSettings ? 
                    <div>
                        <RatingsFilter filterObj={filterObj}/>
                    </div> : null
                }
                {ratings.map((nameObj)=>{
                    nameObj.myRating = (Math.round(Math.random()*20))/2;
                    nameObj.partnerRating = (Math.round(Math.random()*20))/2;
                    return <Rating key={JSON.stringify(nameObj)} dispatch={dispatch} nameObj={nameObj}/>
                })}
                {isMore ? showMoreButton : ''}
            </div>
        </div>
    )
}

function RatePage({nameObj, gender = 'any'}){

    let [rateObj, setRateObj] = React.useState(nameObj);
    let [randomGender, setRandomGender] = React.useState('any');

    let setRandomRate = (gender) => {
        Rate.getRandomRate(gender).then((rate) => {
            rate.myRating = parseInt(Math.random()*20)/2;
            rate.partnerRating = parseInt(Math.random()*20)/2;
            setRateObj(rate);
        });
    }

    React.useEffect(()=>{
        if (nameObj == null) setRandomRate(gender);
    }, []);

    if (rateObj == null) return null;

    let {name, isMale, rank, myRating, partnerRating} = rateObj;
    let rating = avg(myRating, partnerRating);
    let _genderStr = genderStr(isMale);

    return (
        <div id='ratePage' className="col">
            <div id='rateHeader' className={`spacer col ${_genderStr}`}>
                <p id='rateName' className={(name.length > 7 ? 'long':'')}>{name}</p>
                <div id='rateGender' className='row centerCross'>
                    <p>Gender: </p>
                    <p id='rateGenderActual'>{_genderStr}</p>
                    {ChevronIcon}
                </div>
                <div id='ratePop' className='row centerCross'>
                    {PopIcon}
                    <p id='popLabel'>popularity</p>
                    <p id='pop'>{rank}</p>
                    <p id='popSuffix' className={getNumberSuffix(rank)}></p>
                </div>
                <div className='spacer'></div>
                <div id='rateRatingContainer' className='row centerCross'>
                    {StarIcon}
                    <p id='rateRating'>{rating}</p>
                </div>
            </div>
            <section className={`${isMobile() ? 'col' : 'row'} spacer`}>
                <div className='row centerCross spacer'>
                    <div className='spacer'></div>
                    <div className='rating col centerCross'>
                        <p>Your Rating</p>
                        <div className="row centerCross">
                            {EditIcon}
                            <input className='ratingNumber' value={myRating.toFixed(1)}/>
                        </div>
                    </div>
                    <div id='ratingPartner' className='rating col centerCross'>
                        <p>Partner Rating</p>
                        <p className='ratingNumber'>{partnerRating.toFixed(1)}</p>
                    </div>
                    <div className='spacer'></div>
                </div>
                <div id='newRating' className='col centerCross spacer'>
                    <div className='spacer'></div>
                    <p className='newRateDesc'>Rate a random name you haven't rated yet</p>
                    <div id='randomButton' className="row centerCross">
                        <button 
                            id='randomName' 
                            className='newRate row centerCross' 
                            onClick={()=>{
                                setRandomRate(gender);
                            }}
                            type='button'
                        >{DiceIcon}Random Name</button>
                        <button className="row centerCross">
                            <p className='spacer'>{randomGender}</p> 
                            {ChevronIcon}</button>
                    </div>
                    <div className='spacer'></div>
                    <p className='newRateDesc'>Search for an existing name, or add a new one</p>
                    <button id='searchName' className='newRate'>{SearchIcon}</button>
                    <div className='spacer'></div>
                </div>
            </section>
        </div>
    );
}
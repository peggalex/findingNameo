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

function messageStrToJSON(messageStr){
	let message = JSON.parse(messageStr);
	if (message.error != null){
		throw new Error(message.error);
	}
	return message;
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

const avg = (x1, x2) => {
    let x = ((parseFloat(x1)+parseFloat(x2))/2).toFixed(1);
    return isNaN(x) ? "?" : x;
};

class UserObject {
    static instance = new UserObject(); // singleton
    
    static set(username, password){
        UserObject.instance.username = username;
        UserObject.instance.password = password;
        UserObject.instance.ws = UserObject.getWebSocket(username, password);
    }

    static getUsername = () => UserObject.instance.username;
    static getPassword = () => UserObject.instance.password;

    static addWebSocketCallback = (func) => {
        UserObject.instance.ws.onmessage = (event) => {
            console.log('received msg:', event.data);
            func(event);
        }
    }

    static removeWebSocketCallback = () => UserObject.instance.ws.onmessage = () => {};

    static reset = () => {
        UserObject.instance.ws.close();
        UserObject.instance = new UserObject();
    }

    static getWebSocket(username, password){

        let wsPort = parseInt(location.port)+1;

		let ws = new WebSocket(
			`ws://${location.hostname}:${wsPort}/?username=${username}&password=${password}`
		);
        ws.onopen = (event) => console.log("Connected to websocket.");
        return ws;
    }

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
        mainPage: <MainPage setPageSuper={setPage}/>
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


function MainPageNav({name, icon, page, setPage}){
    const selected = () => pageState.pageName==name+'Page';
    return (
        <div 
            className={'mainPageNav col centerAll clickable '+(selected() ? 'selected' : '')} 
            onClick={()=>setPage()}
        >
            {icon}
            <p>{name}</p>
        </div>
    );
}

class DynamicRating {
	constructor(obj){
        Object.assign(this, obj);
        if (['name', 'isMale', 'username', 'rating'].some((p) => this[p] === undefined)) throw new Error(
            `Rate requires name and isMale, got: "${obj}"`
        );
    }
    
    isPartners = () => this.username != UserObject.getUsername();
}

function MainPage({setPageSuper}){

    var pages = {};

    let [pageInner, setPageInner] = React.useState(<RatingsPage pageDispatch={pageDispatch}/>);

    React.useEffect(()=>{
        //runs once after first render pass (componentDidMount) iff diff = []
    }, []);

    return (
        <div id='mainPage' className='col'>
            <header className='row centerCross'>
                <h1>Finding <span>Name</span>o</h1>
                {CogIcon}
            </header>
            <section id='mainContent'>
                {page}
            </section>
            <footer className='row spaceEvenly centerAll'>
                <MainPageNav name='ratings' icon={RatingsIcon} page={page} setPage={setPage}/>
                <MainPageNav name='partner' icon={PartnerIcon} page={page} setPage={setPage}/>
                <MainPageNav name='rate' icon={RateIcon} page={page} setPage={setPage}/>
            </footer>
        </div>
    );
}

class Rate {
    constructor(obj){
        Object.assign(this, obj);
        if (['name', 'isMale'].some((p) => this[p] === undefined)) throw new Error(
            `Rate requires name and isMale, got: "${obj}"`
        );
    }

    static async getRandomRate(gender){
        // gender in {any, male, female, unisex}
        let rate = new Rate(await waitForAjaxCall('get', `
            randomName/${UserObject.getUsername()}
            /password/${UserObject.getPassword()}
            /gender/${gender}
        `));
        if (rate.name == null) {
            alert(`No ${gender} ratings created (yet).`);
            return null;
        }
        return rate;
    }
}

function Rating({pageDispatch, nameObj}){

    let {name, isMale, rank, myRating, partnerRating} = nameObj;
        
    let popSuffix = getNumberSuffix(rank);
    const goToRate = () => {
        pageDispatch({
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
                <p className={'name '+(name.length > 9 ? 'long':'')}>{name}</p>
                { rank ? 
                <div className='row'>
                    <p className='popLabel'>popularity</p>
                    <p className='pop'>{rank}</p>
                    <p className={popSuffix + ' popSuffix'}></p>
                </div> : <p className="popLabel">+ new name</p> }
            </div>
            <div className='spacer'></div>
            {StarIcon}
            <p className='rating'>{avg(myRating, partnerRating)}</p>
            <div className='partnerRatings'>
                <PersonRating rating={myRating==null ? '?' : myRating.toFixed(1)} isYou={true}/>
                <PersonRating rating={partnerRating==null ? '?' : partnerRating.toFixed(1)} isYou={false}/>
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
            let newIndex = (subFilterIndex + 1) % subFilterElements.length;
            setSubFilterIndex(newIndex);
            setSubFilter(subFilterElements[newIndex]);
        } else {
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
                subFilterElements={['desc', 'asc']} 
                filterObj={filterObj}
            />
            <RatingsFilterOption 
                filterName='my rating' 
                subFilterElements={['desc', 'asc']} 
                filterObj={filterObj}
            />
            <RatingsFilterOption 
                filterName='partner rating' 
                subFilterElements={['desc', 'asc']} 
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

function RatingsPage({pageDispatch}){

    let searchRef = React.useRef(null);

    let [ratings, setRatings] = React.useState([]);
    let [isMore, setIsMore] = React.useState(false);

    let getRatingsSetIsMore = async (filter, subFilter, range, rangeStart) => {

        let {ratings, isMore} = await waitForAjaxCall('get', `
            /ratings/${UserObject.getUsername()}
            /password/${UserObject.getPassword()}
            /filter/${filter.replace(/ /g, '')}
            /subFilter/${subFilter.replace(/ /g, '')}
            /range/${range}
            /rangeStart/${rangeStart}
            /search/${searchRef.current ? searchRef.current.value : ''}
        `);

        setIsMore(isMore);
        return ratings;
    }

    let [showSettings, setShowSettings] = React.useState(false);
    let [filter, setFilter] = React.useState('avg rating');
    let [subFilter, setSubFilter] = React.useState('desc');

    React.useEffect(()=>{
        getRatingsSetIsMore(filter, subFilter, ResultsAtATime, 0).then(setRatings);
    }, [filter, subFilter]);

    React.useEffect(()=>{

	    UserObject.addWebSocketCallback(async (event) => {

	    	let {type, dynamicRating} = messageStrToJSON(event.data);
            dynamicRating = new DynamicRating(dynamicRating);
            console.log('here');
            switch (type){
                case "rating":
                    console.log('here2');
                    let ratingsLength;
                    setRatings((prevState) => {
                        ratingsLength = prevState.length;
                        return prevState;
                    });
                    getRatingsSetIsMore(filter, subFilter, ratingsLength, 0).then(setRatings);

                    console.log('here3');
                    break;
                
                default:
                    throw new Error(`unknown websocket type: "${type}"`);
            }
        });

        return UserObject.removeWebSocketCallback;
    }, []);

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
                    return <Rating key={JSON.stringify(nameObj)} pageDispatch={pageDispatch} nameObj={nameObj}/>
                })}
                {isMore ? showMoreButton : ''}
            </div>
        </div>
    )
}

class RatingError { constructor(msg){ this.message=msg; } }

function RatePage({nameObj}){

    let ratingHasChanged = () => false;

    let [inputMsg, setInputMsg] = React.useState("");

    let [rateObj, setRateObj] = React.useState(nameObj);
    let [myCurrentRating, setMyCurrentRating] = React.useState(null);

    let randomGenders = ['any', 'male', 'female', 'unisex'];
    let [randomGenderIndex, setRandomGenderIndex] = React.useState(0);

    let inputRatingRef = React.useRef(null);

    let updateRating = (rating) => {
        setMyCurrentRating(rating);
        let inputRating = inputRatingRef.current;
        if (inputRating != null) inputRating.value = rating == null ? "" : rating.toFixed(1);
    }

    let setRandomRate = () => {
        if (ratingHasChanged()){
            if (!confirm("Rating has changed without saving, are you sure you want to leave?")) return;
        }
        Rate.getRandomRate(randomGenders[randomGenderIndex]).then((rate) => {
            if (rate == null) return;
            updateRating(rate.myRating);
            setRateObj(rate);
        });
    }
    React.useEffect(()=>{
        if (nameObj == null){
            setRandomRate('any');
        } else {
            updateRating(nameObj.myRating);
        }

	    UserObject.addWebSocketCallback(async (event) => {

	    	let {type, dynamicRating} = messageStrToJSON(event.data);
            dynamicRating = new DynamicRating(dynamicRating);
            switch (type){
                case "rating":
                    if (!(dynamicRating && rateObj)) return;
                    if (rateObj.name == dynamicRating.name && 
                            rateObj.isMale == dynamicRating.isMale){   
            
                        let ratingName = dynamicRating.isPartners() ? 'partnerRating' : 'myRating';
                        rateObj[ratingName] = parseFloat(dynamicRating.rating);
                        setRateObj({...rateObj});
                    }
                    break;
                
                default:
                    throw new Error(`unknown websocket type: "${type}"`);
            }
        });

        return UserObject.removeWebSocketCallback;
    }, []);

    if (rateObj == null) return null;

    let {name, isMale, rank, myRating, partnerRating} = rateObj;

    let _genderStr = genderStr(isMale);

    ratingHasChanged = () => myRating != myCurrentRating;

    let validateInput = () => {
        let inputEl = inputRatingRef.current;
        if (inputEl == null) return;
        let ratingStr = inputEl.value;

        try {
            if (isNaN(ratingStr)) throw new RatingError("Rating must be a number.");

            let rating = parseFloat(ratingStr);

            if (!((0 <= rating) || (rating <= 10))) throw new RatingError("Rating must be between [0, 10].");
            if (!((rating*2)%1==0)) throw new RatingError("Rating must be a whole or half number.");

            updateRating(rating);
            console.log('rating set to:', rating);
            inputEl.setCustomValidity("");
            return true;

        } catch (e) {
            if (e instanceof RatingError){
                inputEl.setCustomValidity(e.message);
                inputEl.reportValidity();
                return false;
            } else {
                throw e;
            }
        }
    }

    return (
        <div id='ratePage' className="col">
            <div id='rateHeader' className={`spacer col ${_genderStr}`}>
                <div className="row">
                    <div className='spacer'></div>
                    <div id='rateGender' className='row centerCross'>
                        <p>Gender: </p>
                        <p id='rateGenderActual'>{_genderStr}</p>
                    </div>
                </div>
                <p id='rateName' className={(name.length > 9 ? 'long':'')}>{name}</p>
                { (rank) ? <div id='ratePop' className='row centerCross'>
                    {PopIcon}
                    <p id='popLabel'>popularity</p>
                    <p id='pop'>{rank}</p>
                    <p id='popSuffix' className={getNumberSuffix(rank)}></p>
                </div> : <div id='ratePop'><p>+ new name</p></div>}
                <div className='spacer'></div>
                <div id='rateRatingContainer' className='row centerCross'>
                    {StarIcon}
                    <p id='rateRating'>{avg(myCurrentRating, partnerRating)}</p>
                </div>
            </div>
            <section className={`${isMobile() ? 'col' : 'row'} spacer`}>
                <div className='row centerCross spacer'>
                    <div className='spacer'></div>
                    <div className='rating col centerCross'>
                        <p>Your Rating</p>
                        <div className="col centerCross">
                            <div className="row centerCross">
                                <div
                                    className='clickable'
                                    onClick={()=>{
                                        let currentRating = (myCurrentRating == null) ? 5 : myCurrentRating;
                                        console.log('rating is:', currentRating);
                                        if ((currentRating+=0.5) > 10) return;
                                        updateRating(currentRating);
                                    }}
                                >
                                    {ArrowUpIcon}
                                </div>
                                <form>
                                    <input 
                                        ref = {inputRatingRef}
                                        onChange={validateInput}
                                        className='ratingNumber' 
                                        name='ratingNumber'
                                        placeholder="?" 
                                        defaultValue={myCurrentRating != null ? myCurrentRating.toFixed(1) : ''}
                                    />
                                </form>
                                <div
                                    className='clickable'
                                    onClick={()=>{
                                        let currentRating = (myCurrentRating == null) ? 5 : myCurrentRating;
                                        if ((currentRating-=0.5) < 0) return;
                                        updateRating(currentRating);
                                    }}
                                >
                                    {ArrowDownIcon}
                                </div>
                            </div>
                            <p 
                                onClick = {async ()=>{
                                    console.log(await waitForAjaxCall('put', `
                                        /rate/${UserObject.getUsername()}
                                        /password/${UserObject.getPassword()}
                                        /name/${name}
                                        /isMale/${isMale}
                                        /rating/${myCurrentRating}
                                    `));
                                    /*let _rateObj = {...rateObj};
                                    _rateObj.myRating = myCurrentRating;
                                    setRateObj(_rateObj);*/
                                }}
                                className={
                                    'saveSpace saveButton ' + (ratingHasChanged() ? 'canSave clickable' : 'notCanSave disabled')
                                }
                            >save</p>
                        </div>
                    </div>
                    <div id='ratingPartner' className='rating col centerCross'>
                        <p>Partner Rating</p>
                        <p className='ratingNumber centerAll'>{partnerRating != null ? partnerRating.toFixed(1) : ClockIcon}</p>
                        <p className='saveSpace'></p>
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
                            onClick={setRandomRate}
                            type='button'
                        >{DiceIcon}Random Name</button>
                        <button className="row centerCross" onClick={
                            ()=>setRandomGenderIndex((randomGenderIndex+1)%randomGenders.length)
                        }>
                            <p className='spacer'>{randomGenders[randomGenderIndex]}</p> 
                            {ChevronIcon}
                        </button>
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
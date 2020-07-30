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
            throw Exception('isMale must be an int in {-1,0,1}.');
    }
}

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
        <div id='logoContainer' className="row center centerCross">
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

    let login = async (e) => {
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

    let validate = () => {
        let form = formRef.current;
        if (form.password.value !== form.password2.value){
            form.password2.setCustomValidity("passwords must match.");
            return false;
        } else {
            form.password2.setCustomValidity('');
        }
    }

    let signup = async (e) => {
        e.preventDefault();

        let form = formRef.current;
        let passwordHashed = await hash(form.password.value);
        try {
            await waitForAjaxCall('put', `
                /register/${form.username.value}
                /nickname/${form.nickname.value}
                /password/${passwordHashed}
            `);
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

function MainPageNav({name, icon, setMainPage, mainPage}){
    return (
        <div 
            className={'mainPageNav col center centerCross '+(mainPage==name+'Page' ? 'selected' : '')} 
            onClick={()=>setMainPage(name+'Page')}
        >
            {icon}
            <p>{name}</p>
        </div>
    );
}

function MainPage({setPage}){

    let [mainPage, setMainPage] = React.useState("ratingsPage");

    let pages = {
        ratingsPage: <RatingsPage setPage={setMainPage}/>
    }

    return (
        <div id='mainPage' className='col'>
            <header className='row centerCross'>
                <h1>Finding <span>Name</span>o</h1>
                {CogIcon}
            </header>
            <section id='mainContent'>
                {pages[mainPage]}
            </section>
            <footer className='row spaceEvenly centerCross'>
                <MainPageNav name='ratings' icon={RatingsIcon} setMainPage={setMainPage} mainPage={mainPage}/>
                <MainPageNav name='partner' icon={PartnerIcon} setMainPage={setMainPage} mainPage={mainPage}/>
                <MainPageNav name='rate' icon={RateIcon} setMainPage={setMainPage} mainPage={mainPage}/>
            </footer>
        </div>
    );
}


function Rating({name}){
    let youRating = (Math.round(Math.random()*20))/2;
    let partnerRating = (Math.round(Math.random()*20))/2;
    let rating = (youRating+partnerRating)/2;

    let popSuffix;
    switch (parseInt(name.rank)){
        case 1:
            popSuffix = "st";
            break;
        case 2:
            popSuffix = "nd";
            break;
        case 3:
            popSuffix = "rd";
            break;
        default:
            popSuffix = "th";
    }

    return (
        <div className='row centerCross'>
            <div className={'col center gender '+isMaleStr(name.isMale)}>
                <p>{isMaleStr(name.isMale)}</p>
            </div>
            <div className='genderPlaceholder'></div>
            <div className='namePop'>
                <p className='name'>{name.name}</p>
                <div className='row'>
                    <p className='popLabel'>popularity</p>
                    <p className='pop'>{name.rank}</p>
                    <p className={popSuffix + ' popSuffix'}></p>
                </div>
            </div>
            <div className='spacer'></div>
            {StarIcon}
            <p className='rating'>{rating.toFixed(1)}</p>
            <div className='partnerRatings'>
                <PersonRating rating={youRating.toFixed(1)} isYou={true}/>
                <PersonRating rating={partnerRating.toFixed(1)} isYou={false}/>
            </div>
        </div>
    );
}

const GetRatingFilterIcon = (str) => {
    let dic = {
        desc: <svg transform="rotate(90)" xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="arrowUp"><circle cx={12} cy={12} r={10} /><polyline points="12 16 16 12 12 8" /><line x1={8} y1={12} x2={16} y2={12} /></svg>,
        asc: <svg transform="rotate(-90)" xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="arrowUp"><circle cx={12} cy={12} r={10} /><polyline points="12 16 16 12 12 8" /><line x1={8} y1={12} x2={16} y2={12} /></svg>
    }
    return dic[str] ? dic[str] : <p className='ratingFilterIcon centerAll'>{str}</p>;
}

function RatingsFilterOption({filterName, subFilterElements, filterObj: {filter, setFilter, setSubFilter}}){

    let [subFilterIndex, setSubFilterIndex] = React.useState(0);

    const isSelected = () => filter==filterName;

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

function RatingsPage({setPage}){

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


    let filterObj = {filter, setFilter, setSubFilter}; //todo: turn into useContext

    return (
        <div id='ratingsPage'>
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
            <div id='ratingsTableContainer' className='col'>
                {showSettings ? 
                    <div>
                        <RatingsFilter filterObj={filterObj}/>
                        <div id='filterBackground'></div>
                    </div> : null
                }
                {ratings.map((name)=><Rating key={JSON.stringify(name)} name={name}/>)}
                {isMore ? <button id='showMoreButton' type='button' onClick={
                    async () => {
                        let scrollPos = $('#mainContent').scrollTop();
                        let newRatings = await getRatingsSetIsMore(filter, subFilter, ResultsAtATime, ratings.length)
                        setRatings(ratings.concat(newRatings));
                        $('#mainContent').scrollTop(scrollPos);
                    }
                }>show more</button> : ''}
            </div>
        </div>
    )
}

const Logo = <svg className="pram" x="0px" y="0px" viewBox="-100 0 850 1000">
    <g>
    <g className="bubble">
        <defs>
        <path id="SVGID_1_" d="M362.505,130.338l-24.828,31.922l-24.828-31.922H121.269c-14.44,0-26.144-11.704-26.144-26.143V63.527
            c0-14.439,11.704-26.143,26.144-26.143h432.819c14.439,0,26.145,11.704,26.145,26.143v40.668
            c0,14.439-11.705,26.143-26.145,26.143H362.505z" />
        </defs>
        <clipPath id="SVGID_2_">
        <use xlinkHref="#SVGID_1_" overflow="visible" />
        </clipPath>
        <g clipPath="url(#SVGID_2_)">
        <defs>
            <rect id="SVGID_3_" x="-127.094" y="-16.205" width="929.546" height="1800.994" />
        </defs>
        <clipPath id="SVGID_4_">
            <use xlinkHref="#SVGID_3_" overflow="visible" />
        </clipPath>
        <rect x="80.601" y="22.86" opacity="0.5" clipPath="url(#SVGID_4_)" width="514.154" height="153.924" />
        </g>
        <text transform="matrix(1 0 0 1 185.1738 106.3818)" fill="#FFFFFF" fontFamily="'SFProDisplay-Regular'" fontSize="69.7159">&lt;untitled&gt;</text>
        <g>
        <defs>
        <circle id="SVGID_5_" cx="143.85" cy="84.031" r="31.165" />
        </defs>
        <clipPath id="SVGID_6_">
        <use xlinkHref="#SVGID_5_" overflow="visible" />
        </clipPath>
        <g clipPath="url(#SVGID_6_)">
        <defs>
            <rect id="SVGID_7_" x="-127.094" y="-16.205" width="929.546" height="1800.994" />
        </defs>
        <clipPath id="SVGID_8_">
            <use xlinkHref="#SVGID_7_" overflow="visible" />
        </clipPath>
        <rect x="98.162" y="38.342" clipPath="url(#SVGID_8_)" fill="#A3BFFA" width="91.376" height="91.378" />
        </g>
    </g>
    <g>
    </g>
        <defs>
        <path id="SVGID_9_" d="M149.661,87.225h-1.084c-1.439,0.582-3.04,0.914-4.726,0.914s-3.281-0.332-4.727-0.914h-1.083
            c-4.811,0-8.714,3.436-8.714,7.671v2.372c0,1.512,1.394,2.74,3.112,2.74h22.823c1.719,0,3.114-1.228,3.114-2.74v-2.372
            C158.375,90.661,154.472,87.225,149.661,87.225z M143.85,84.031c4.457,0,8.069-3.576,8.069-7.988
            c0-4.411-3.612-7.988-8.069-7.988c-4.458,0-8.068,3.577-8.068,7.988C135.782,80.455,139.393,84.031,143.85,84.031z" />
        </defs>
        <clipPath id="SVGID_10_">
        <use xlinkHref="#SVGID_9_" overflow="visible" />
        </clipPath>
        <g clipPath="url(#SVGID_10_)">
        <defs>
            <rect id="SVGID_11_" x="-127.094" y="-16.205" width="929.546" height="1800.994" />
        </defs>
        <clipPath id="SVGID_12_">
            <use xlinkHref="#SVGID_11_" overflow="visible" />
        </clipPath>
        <rect x="114.802" y="53.531" clipPath="url(#SVGID_12_)" fill="#FFFFFF" width="58.097" height="61.001" />
        </g>
    </g>
    <g>
        <defs>
        <path id="SVGID_13_" d="M166.96,691.742c0,0,29.188,70.36,59.593,93.472l205.533,0.17c0,0,23.113-43.839,27.976-93.642H166.96z" />
        </defs>
        <clipPath id="SVGID_14_">
        <use xlinkHref="#SVGID_13_" overflow="visible" />
        </clipPath>
        <g clipPath="url(#SVGID_14_)">
        <defs>
            <rect id="SVGID_15_" x="-127.094" y="-16.205" width="929.546" height="1800.994" />
        </defs>
        <clipPath id="SVGID_16_">
            <use xlinkHref="#SVGID_15_" overflow="visible" />
        </clipPath>
        <rect x="152.436" y="677.218" clipPath="url(#SVGID_16_)" fill="#4C51BF" width="322.149" height="122.688" />
        </g>
    </g>
    <g>
        <defs>
        <path id="SVGID_17_" d="M49.974,450.003c0,0,33.068-25.797,37.935-119.441l170.266,119.441H49.974z" />
        </defs>
        <clipPath id="SVGID_18_">
        <use xlinkHref="#SVGID_17_" overflow="visible" />
        </clipPath>
        <g clipPath="url(#SVGID_18_)">
        <defs>
            <rect id="SVGID_19_" x="-127.094" y="-16.205" width="929.546" height="1800.994" />
        </defs>
        <clipPath id="SVGID_20_">
            <use xlinkHref="#SVGID_19_" overflow="visible" />
        </clipPath>
        <rect x="35.45" y="316.038" clipPath="url(#SVGID_20_)" fill="#4C51BF" width="237.248" height="148.489" />
        </g>
    </g>
    <g>
        <path fill="none" stroke="#434190" strokeWidth="1.4524" strokeMiterlimit={10} d="M49.974,450.003
        c0,0,33.068-25.797,37.935-119.441l170.266,119.441H49.974z" />
    </g>
    <g>
        <defs>
        <path id="SVGID_21_" d="M87.909,330.178c0,0,94.862-55.946,107.021-92.432l63.245,211.876L87.909,330.178z" />
        </defs>
        <clipPath id="SVGID_22_">
        <use xlinkHref="#SVGID_21_" overflow="visible" />
        </clipPath>
        <g clipPath="url(#SVGID_22_)">
        <defs>
            <rect id="SVGID_23_" x="-127.094" y="-16.205" width="929.546" height="1800.994" />
        </defs>
        <clipPath id="SVGID_24_">
            <use xlinkHref="#SVGID_23_" overflow="visible" />
        </clipPath>
        <rect x="73.384" y="223.222" clipPath="url(#SVGID_24_)" fill="#4C51BF" width="199.314" height="240.925" />
        </g>
    </g>
    <g>
        <path fill="none" stroke="#434190" strokeWidth="1.4524" strokeMiterlimit={10} d="M87.909,330.178
        c0,0,94.862-55.946,107.021-92.432l63.245,211.876L87.909,330.178z" />
    </g>
    <g>
        <defs>
        <path id="SVGID_25_" d="M194.932,237.747c0,0,76.163-3.342,123.278-27.478L258.173,449.62L194.932,237.747z" />
        </defs>
        <clipPath id="SVGID_26_">
        <use xlinkHref="#SVGID_25_" overflow="visible" />
        </clipPath>
        <g clipPath="url(#SVGID_26_)">
        <defs>
            <rect id="SVGID_27_" x="-127.094" y="-16.205" width="929.546" height="1800.994" />
        </defs>
        <clipPath id="SVGID_28_">
            <use xlinkHref="#SVGID_27_" overflow="visible" />
        </clipPath>
        <rect x="180.408" y="195.745" clipPath="url(#SVGID_28_)" fill="#4C51BF" width="152.327" height="268.399" />
        </g>
    </g>
    <g>
        <path fill="none" stroke="#434190" strokeWidth="1.4524" strokeMiterlimit={10} d="M194.932,237.747
        c0,0,76.163-3.342,123.278-27.478L258.173,449.62L194.932,237.747z" />
        <path fill="none" stroke="#CBD5E0" strokeWidth="22.9859" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} d="
        M326.641,210.269L266.604,449.62L326.641,210.269z" />
    </g>
    <g>
        <defs>
        <path id="SVGID_29_" d="M64.5,582.173h462.852c8.023,0,14.525-6.502,14.525-14.524V449.62H49.976v118.028
            C49.976,575.671,56.479,582.173,64.5,582.173z" />
        </defs>
        <clipPath id="SVGID_30_">
        <use xlinkHref="#SVGID_29_" overflow="visible" />
        </clipPath>
        <g clipPath="url(#SVGID_30_)">
        <defs>
            <rect id="SVGID_31_" x="-127.094" y="-16.205" width="929.546" height="1800.994" />
        </defs>
        <clipPath id="SVGID_32_">
            <use xlinkHref="#SVGID_31_" overflow="visible" />
        </clipPath>
        <rect x="35.452" y="435.096" clipPath="url(#SVGID_32_)" fill="#4C51BF" width="520.949" height="161.6" />
        </g>
    </g>
    <g>
        <line fill="none" stroke="#CBD5E0" strokeWidth="22.9859" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="49.974" y1="460.348" x2="541.873" y2="460.348" />
        <line fill="none" stroke="#CBD5E0" strokeWidth="22.9859" strokeLinecap="round" strokeMiterlimit={10} x1="216.647" y1="658.348" x2="482.76" y2="849.439" />
        <polyline fill="none" stroke="#CBD5E0" strokeWidth="22.9859" strokeLinecap="round" strokeMiterlimit={10} points="
        160.865,875.024 127.36,825.061 127.36,746.118 344.906,532.271 624.787,257.152 		" />
        <line fill="none" stroke="#CBD5E0" strokeWidth="22.9859" strokeMiterlimit={10} x1="344.963" y1="750.735" x2="344.963" y2="532.368" />
        <line fill="none" stroke="#2D3748" strokeWidth="22.9859" strokeLinecap="round" strokeMiterlimit={10} x1="624.783" y1="257.152" x2="557.447" y2="323.342" />
        <g className='wheel frontWheel'>
            <path fill="none" stroke="#2D3748" strokeWidth="22.9859" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} d="
            M221.675,874.723c0,33.956-27.529,61.487-61.485,61.487c-33.955,0-61.484-27.531-61.484-61.487
            c0-33.955,27.529-61.481,61.484-61.481C194.146,813.241,221.675,840.768,221.675,874.723z" />
            <line fill="none" stroke="#2D3748" strokeWidth="3.8315" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="159.924" y1="813.563" x2="159.924" y2="936.157" />
            <line fill="none" stroke="#2D3748" strokeWidth="3.8315" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="99.01" y1="875.249" x2="221.603" y2="875.249" />
            <line fill="none" stroke="#2D3748" strokeWidth="3.8315" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="116.598" y1="831.897" x2="203.28" y2="918.585" />
            <line fill="none" stroke="#2D3748" strokeWidth="3.8315" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="117.138" y1="918.585" x2="203.821" y2="831.895" />
            <line fill="none" stroke="#2D3748" strokeWidth="3.8315" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="134.055" y1="819.469" x2="185.863" y2="930.576" />
            <line fill="none" stroke="#2D3748" strokeWidth="3.8315" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="104.915" y1="901.117" x2="216.022" y2="849.304" />
            <line fill="none" stroke="#2D3748" strokeWidth="3.8315" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="102.534" y1="854.396" x2="217.733" y2="896.326" />
            <line fill="none" stroke="#2D3748" strokeWidth="3.8315" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="139.659" y1="932.732" x2="181.59" y2="817.536" />
        </g>
        <g className='wheel backWheel'>
            <path fill="none" stroke="#2D3748" strokeWidth="22.9859" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} d="
            M569.529,849.439c0,47.922-38.847,86.768-86.769,86.768c-47.923,0-86.771-38.846-86.771-86.768
            c0-47.915,38.848-86.769,86.771-86.769C530.683,762.671,569.529,801.524,569.529,849.439z" />
            <line fill="none" stroke="#2D3748" strokeWidth="3.8315" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="481.729" y1="769.895" x2="481.729" y2="930.032" />
            <line fill="none" stroke="#2D3748" strokeWidth="3.8315" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="402.427" y1="850.729" x2="562.562" y2="850.729" />
            <line fill="none" stroke="#2D3748" strokeWidth="3.8315" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="425.385" y1="793.904" x2="538.561" y2="907.082" />
            <line fill="none" stroke="#2D3748" strokeWidth="3.8315" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="426.094" y1="907.082" x2="539.272" y2="793.904" />
            <line fill="none" stroke="#2D3748" strokeWidth="3.8315" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="447.959" y1="777.721" x2="515.639" y2="922.853" />
            <line fill="none" stroke="#2D3748" strokeWidth="3.8315" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="410.254" y1="884.49" x2="555.381" y2="816.816" />
            <line fill="none" stroke="#2D3748" strokeWidth="3.8315" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="407.046" y1="823.29" x2="557.447" y2="878.034" />
            <line fill="none" stroke="#2D3748" strokeWidth="3.8315" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="455.518" y1="931.379" x2="510.26" y2="780.976" />
        </g>
    </g>
    </g>
    <g>
    <defs>
        <circle id="SVGID_33_" cx="625.408" cy="256.403" r="14.839" />
    </defs>
    <clipPath id="SVGID_34_">
        <use xlinkHref="#SVGID_33_" overflow="visible" />
    </clipPath>
    <g clipPath="url(#SVGID_34_)">
        <defs>
        <rect id="SVGID_35_" x="-88.214" y="-6.338" width="886.341" height="1717.285" />
        </defs>
        <clipPath id="SVGID_36_">
        <use xlinkHref="#SVGID_35_" overflow="visible" />
        </clipPath>
        <rect x="596.72" y="227.714" clipPath="url(#SVGID_36_)" fill="#2D3748" width="57.376" height="57.377" />
    </g>
    </g>
</svg>

const Leaves = <svg className='leaves' x="0px" y="0px" viewBox="0 0 1000 1000">
    <g id="leaves">
    <g>
        <path fill="#48BB78" d="M-12.184-23.419c0,0-19.612,29.382,50.436,48.995C38.251,25.576,33.115-37.935-12.184-23.419z" />
        <path fill="none" stroke="#38A169" strokeWidth="0.467" strokeMiterlimit={10} d="M-12.184-23.419
			c0,0,38.604,28.137,50.436,48.995" />
        <animateMotion begin="-1.5s" dur="3s" rotate="auto" repeatCount="indefinite">
        <mpath href="#guide1">
        </mpath></animateMotion>
    </g>
    <g>
        <path fill="#48BB78" d="M12.276-18.721c0,0-34.09,35.957,0,61.645C12.276,42.921,50.315,27.462,12.276-18.721z">         
        </path>
        <path fill="none" stroke="#38A169" strokeWidth="0.467" strokeMiterlimit={10} d="M12.276-18.721c0,0,2.882,41.406,0,61.645" />
        <animateMotion begin="-1s" dur="3s" rotate="auto" repeatCount="indefinite">
        <mpath href="#guide2">
        </mpath></animateMotion>   
    </g>
    <g>
        <path fill="#48BB78" d="M12.276-18.721c0,0-34.09,35.957,0,61.645C12.276,42.921,50.315,27.462,12.276-18.721z" />
        <path fill="none" stroke="#38A169" strokeWidth="0.467" strokeMiterlimit={10} d="M12.276-18.721c0,0,2.882,41.406,0,61.645" />
        <animateMotion begin="-2s" dur="2.5s" rotate="auto" repeatCount="indefinite">
        <mpath href="#guide3">
        </mpath></animateMotion>   
    </g>
    <g>
        <path fill="#48BB78" d="M-12.184-23.419c0,0-19.612,29.382,50.436,48.995C38.251,25.576,33.115-37.935-12.184-23.419z" />
        <path fill="none" stroke="#38A169" strokeWidth="0.467" strokeMiterlimit={10} d="M-12.184-23.419
			c0,0,38.604,28.137,50.436,48.995" />
        <animateMotion begin="-0.5s" dur="2.5s" rotate="auto" repeatCount="indefinite">
        <mpath href="#guide4">
        </mpath></animateMotion>   
    </g>
    </g>
    <g id="guides">
        <path id='guide1' fill="none" d="M1000,368.891c0,0-401,82.581-500-35.655S705,195,621,355S242,551,121,525S0,457,0,457" />
        <path id='guide2' fill="none" d="M1000,587c0,0-359,42-500-42S89,525,0,611" />
        <path id='guide3' fill="none" d="M1000,690.541c0,0-225.833,62.458-346.413-33.541S425,539,301,595S25,611.664,0,558.332" />
        <path id='guide4' fill="none" d="M1011.771,670.229c0,0-796.222,72.396-779-18c10-52.489,184-34.06,24,58c-60.361,34.729-222-8-245-20" />
    </g>
</svg>

const StarIcon = <svg xmlns="http://www.w3.org/2000/svg" width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="starIcon"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;

const CogIcon = <svg className='cogIcon' xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={3} /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>

const RatingsIcon = <svg xmlns="http://www.w3.org/2000/svg" width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="ratingsIcon"><line x1={8} y1={6} x2={21} y2={6} /><line x1={8} y1={12} x2={21} y2={12} /><line x1={8} y1={18} x2={21} y2={18} /><line x1={3} y1={6} x2="3.01" y2={6} /><line x1={3} y1={12} x2="3.01" y2={12} /><line x1={3} y1={18} x2="3.01" y2={18} /></svg>

const PartnerIcon = <svg xmlns="http://www.w3.org/2000/svg" width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="partnerIcon"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx={9} cy={7} r={4} /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>

const SearchIcon = <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="searchIcon"><circle cx={11} cy={11} r={8} /><line x1={21} y1={21} x2="16.65" y2="16.65" /></svg>

const FilterIcon =  <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="filterIcon"><line x1={4} y1={21} x2={4} y2={14} /><line x1={4} y1={10} x2={4} y2={3} /><line x1={12} y1={21} x2={12} y2={12} /><line x1={12} y1={8} x2={12} y2={3} /><line x1={20} y1={21} x2={20} y2={16} /><line x1={20} y1={12} x2={20} y2={3} /><line x1={1} y1={14} x2={7} y2={14} /><line x1={9} y1={8} x2={15} y2={8} /><line x1={17} y1={16} x2={23} y2={16} /></svg>

const RateIcon = <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="48px" height="48px" viewBox="0 0 48 48" enableBackground="new 0 0 48 48" xmlSpace="preserve" className='rateIcon'>
<g>
  <polygon fill="none" stroke="#000000" strokeWidth="3.5646" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} points="
24,2.545 30.837,16.393 46.122,18.628 35.062,29.401 37.671,44.621 24,37.432 10.328,44.621 12.938,29.401 1.878,18.628 
17.165,16.393 	" />
  <line fill="none" stroke="#000000" strokeWidth="2.8517" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="24.242" y1="20.064" x2="24.242" y2="31.809" />
  <line fill="none" stroke="#000000" strokeWidth="2.8517" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10} x1="18.371" y1="25.938" x2="30.116" y2="25.938" />
</g>
</svg>
import React from 'react';
import {
    isMobile, SetState, 
    Ref, Dispatch, 
    waitForAjaxCall, 
    messageStrToJSON, avg
} from './lib/Utilities';

import UserObject from './lib/UserObject';
import {Rate, DynamicRating} from './lib/Ratings';
import Icons from './lib/Icons';
import LoginPage from './lib/components/LoginPage';
import FrontPage from './lib/components/FrontPage';
import SignupPage from './lib/components/SignupPage';

import { BrowserRouter as Router, Switch, Route, Redirect, useHistory, useLocation } from 'react-router-dom';
import $ from 'jquery';
import './styles/app.css';

function isMaleStr(isMale: number){
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

function genderStr(isMale: number){
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

function getNumberSuffix(number: string | number){
    switch (parseInt(number as any)){
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

function App({}): JSX.Element {
    let getRatio = () => window.innerHeight/window.innerWidth
    let [ratio, setRatio]: [number, SetState<number>] = React.useState(getRatio());

    window.addEventListener("resize", () => setRatio(getRatio()));

    let [page, setPage]: [string, SetState<string>] = React.useState("frontPage");

    let pages: {[key: string]: JSX.Element}  = {
        frontPage: <FrontPage setPage={setPage}/>,
        loginPage: <LoginPage setPage={setPage}/>,
        signupPage: <SignupPage setPage={setPage}/>,
        mainPage: <MainPage setPageSuper={setPage}/>
    }

    return (
        <Router>
            <Switch>
                <Route path="/" exact>
                    <MainPage setPageSuper={setPage}/>
                </Route>
                <Route path="/login">
                    <LoginPage setPage={setPage}/>
                </Route>
                <Route path="/signup">
                    <SignupPage setPage={setPage}/>
                </Route>
                <Route path="/front">
                    <FrontPage setPage={setPage}/>
                </Route>
            </Switch>
        </Router>
    );

}


function App2({}): JSX.Element {
    let getRatio = () => window.innerHeight/window.innerWidth
    let [ratio, setRatio]: [number, SetState<number>] = React.useState(getRatio());

    window.addEventListener("resize", () => setRatio(getRatio()));

    let [page, setPage]: [string, SetState<string>] = React.useState("frontPage");

    let pages: {[key: string]: JSX.Element}  = {
        frontPage: <FrontPage setPage={setPage}/>,
        loginPage: <LoginPage setPage={setPage}/>,
        signupPage: <SignupPage setPage={setPage}/>,
        mainPage: <MainPage setPageSuper={setPage}/>
    }

    return pages[page];

}

function PersonRating({isYou, rating}: {isYou: boolean, rating: number|string}){
    return (
        <div className={(isYou ? 'you' : 'partner')+'Rating personRating'}>
            <p>{rating}</p>
            <p>{isYou ? 'you' : 'partner'}</p>
        </div>
    );
}

interface PageState {
    pageName: string;
    element: JSX.Element|null;
}

interface PageAction{
    type: string;
    pageName: string;
    element?: JSX.Element
}


function MainPageNav(
            {name, icon, pageState, pageDispatch}: 
            {name: string, icon: JSX.Element, pageState: PageState, pageDispatch: Dispatch<PageAction>}
        ){
    const selected = () => pageState.pageName==name+'Page';
    return (
        <div 
            className={'mainPageNav col centerAll clickable '+(selected() ? 'selected' : '')} 
            onClick={()=>pageDispatch({type: 'named', pageName: name+'Page'})}
        >
            {icon}
            <p>{name}</p>
        </div>
    );
}

var pages: {[key: string]: JSX.Element} = {};

function MainPage({setPageSuper}: {setPageSuper: SetState<string>}){

    let history = useHistory();

    let [pageState, pageDispatch]: [PageState, any] = React.useReducer(
            (state: PageState, action: PageAction): PageState=>{

        switch(action.type){
            case 'named':
                return {
                    pageName: action.pageName,
                    element: pages[action.pageName]
                }

            case 'element':
                return {
                    pageName: action.pageName,
                    element: action.element!
                }
            default:
                throw new Error(`invalid pageDispatch action.type: "${action.type}"`);
        }
    }, {pageName: '', element: null});

    React.useEffect((): void=>{
        if (!UserObject.isLoggedIn()) history.push('/front');
        pages['ratingsPage'] = <RatingsPage pageDispatch={pageDispatch}/>
        pages['ratePage'] = <RatePage nameObj={null}/>
        pageDispatch({type: 'named', pageName: 'ratingsPage'});
        //runs once after first render pass (componentDidMount) iff diff = []
    }, []);

    return (
        <div id='mainPage' className='col'>
            <header className='row centerCross'>
                <h1>Finding <span>Name</span>o</h1>
                {Icons.CogIcon}
            </header>
            <section id='mainContent'>
                {pageState.element}
            </section>
            <footer className='row spaceEvenly centerAll'>
                <MainPageNav name='ratings' icon={Icons.RatingsIcon} pageState={pageState} pageDispatch={pageDispatch}/>
                <MainPageNav name='partner' icon={Icons.PartnerIcon} pageState={pageState} pageDispatch={pageDispatch}/>
                <MainPageNav name='rate' icon={Icons.RateIcon} pageState={pageState} pageDispatch={pageDispatch}/>
            </footer>
        </div>
    );
}

function Rating({pageDispatch, nameObj}: {pageDispatch: Dispatch<PageAction>, nameObj: Rate}){

    let {name, isMale, rank, myRating, partnerRating} = nameObj;
        
    let popSuffix: string|null = rank ? getNumberSuffix(rank!) : null;
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
            {Icons.StarIcon}
            <p className='rating'>{avg(myRating, partnerRating)}</p>
            <div className='partnerRatings'>
                <PersonRating rating={myRating==null ? '?' : myRating.toFixed(1)} isYou={true}/>
                <PersonRating rating={partnerRating==null ? '?' : partnerRating.toFixed(1)} isYou={false}/>
            </div>
        </div>
    );
}

const GetRatingFilterIcon = (str: string): JSX.Element => {
    let dic: {[key: string]: JSX.Element} = {
        desc: Icons.ArrowDownIcon,
        asc: Icons.ArrowUpIcon
    }
    return dic[str] ? dic[str] : <p className='ratingFilterIcon centerAll'>{str}</p>;
}

interface FilterObj {
    filter: string, 
    subFilter: string, 
    setFilter: SetState<string>, 
    setSubFilter: SetState<string>
}

function RatingsFilterOption(
            {filterName, subFilterElements, filterObj: {filter, subFilter, setFilter, setSubFilter}}:
            {filterName: string, subFilterElements: string[], filterObj: FilterObj}
        ){

    const isSelected = () => filter==filterName;

    let [subFilterIndex, setSubFilterIndex]: [number, SetState<number>] = React.useState(
        isSelected() ? subFilterElements.indexOf(subFilter) : 0
    );

    const nextIndex = (): void => {
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

function RatingsFilter({filterObj}: {filterObj: FilterObj}){

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

function RatingsPage({pageDispatch}: {pageDispatch: Dispatch<PageAction>}){

    let searchRef: Ref<HTMLInputElement|null> = React.useRef(null);

    let [ratings, setRatings]: [Rate[], Dispatch<Rate[]> | any] = React.useState([] as Rate[]);
    let [isMore, setIsMore] = React.useState(false);

    let getRatingsSetIsMore = async (filter: string, subFilter: string, range: number, rangeStart: number): Promise<Rate[]> => {

        let {ratings, isMore}: {ratings: Rate[], isMore: boolean} = await waitForAjaxCall('get', `
            /ratings/${UserObject.getUsername()}
            /password/${UserObject.getPassword()}
            /filter/${filter.replace(/ /g, '')}
            /subFilter/${subFilter.replace(/ /g, '')}
            /range/${range}
            /rangeStart/${rangeStart}
            /search/${searchRef.current ? searchRef.current!.value : ''}
        `);

        setIsMore(isMore);
        return ratings;
    }

    let [showSettings, setShowSettings]: [boolean, SetState<boolean>] = React.useState(false as boolean);
    let [filter, setFilter]: [string, SetState<string>] = React.useState('avg rating');
    let [subFilter, setSubFilter]: [string, SetState<string>] = React.useState('desc');

    React.useEffect(()=>{
        getRatingsSetIsMore(filter, subFilter, ResultsAtATime, 0).then(setRatings);
    }, [filter, subFilter]);

    React.useEffect(()=>{

	    UserObject.addWebSocketCallback(async (event) => {

	    	let {type, dynamicRating} = messageStrToJSON(event.data);
            dynamicRating = new DynamicRating(dynamicRating);
            switch (type){
                case "rating":
                    let ratingsLength: number;
                    setRatings((prevState: Rate[]): Rate[] => {
                        ratingsLength = prevState.length;
                        return prevState;
                    });
                    getRatingsSetIsMore(filter, subFilter, ratingsLength!, 0).then(setRatings);

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
            $('#mainContent').scrollTop(scrollPos!);
        }
    }>show more</button>;

    return (
        <div id='ratingsPage'>
            <div>
                <div id='filter' className='row centerCross'>
                    <div id='filterButton' className={'clickable' + (showSettings ? 'selected' : '')} onClick={()=>setShowSettings(!showSettings)}>
                        {Icons.FilterIcon}
                    </div>
                    <div id='filterPill' className='row centerCross'>
                        <p id='filterPillName' className='centerAll'>{filter}</p>
                        {GetRatingFilterIcon(subFilter)}
                    </div>
                    <div className='spacer'></div>
                    <input ref={searchRef} onChange={()=>getRatingsSetIsMore(filter, subFilter, ResultsAtATime, 0).then(setRatings)}></input>
                    {Icons.SearchIcon}
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

class RatingError { message: string; constructor(msg: string){ this.message=msg; } }

function RatePage({nameObj}: {nameObj: Rate|null}){

    let ratingHasChanged = () => false;

    let [inputMsg, setInputMsg]: [string, SetState<string>] = React.useState("");

    let [rateObj, setRateObj]: [Rate|null, SetState<Rate|null>] = React.useState(nameObj);
    let [myCurrentRating, setMyCurrentRating]: [number|null, SetState<number|null>] = React.useState<number|null>(null);

    let randomGenders: string[] = ['any', 'male', 'female', 'unisex'];
    let [randomGenderIndex, setRandomGenderIndex]: [number, SetState<number>] = React.useState(0);

    let inputRatingRef: Ref<HTMLInputElement|null> = React.useRef(null);

    let updateRating = (rating: number|null): void => {
        setMyCurrentRating(rating);
        let inputRating = inputRatingRef.current;
        if (inputRating != null) inputRating.value = rating == null ? "" : rating.toFixed(1);
    }

    let setRandomRate = (): void => {
        if (ratingHasChanged()){
            if (!window.confirm("Rating has changed without saving, are you sure you want to leave?")) return;
        }
        Rate.getRandomRate(randomGenders[randomGenderIndex] as ('any'|'male'|'female'|'unisex'))
        .then((rate): void => {
            if (rate == null) return;
            updateRating(rate.myRating!);
            setRateObj(rate);
        });
    }
    React.useEffect((): ()=>void =>{
        if (nameObj == null){
            setRandomRate();
        } else {
            updateRating(nameObj!.myRating);
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
            if (isNaN(ratingStr as any)) throw new RatingError("Rating must be a number.");

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
                    {Icons.PopIcon}
                    <p id='popLabel'>popularity</p>
                    <p id='pop'>{rank}</p>
                    <p id='popSuffix' className={getNumberSuffix(rank)}></p>
                </div> : <div id='ratePop'><p>+ new name</p></div>}
                <div className='spacer'></div>
                <div id='rateRatingContainer' className='row centerCross'>
                    {Icons.StarIcon}
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
                                    {Icons.ArrowUpIcon}
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
                                    {Icons.ArrowDownIcon}
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
                        <p className='ratingNumber centerAll'>{partnerRating != null ? partnerRating.toFixed(1) : Icons.ClockIcon}</p>
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
                        >{Icons.DiceIcon}Random Name</button>
                        <button className="row centerCross" onClick={
                            ()=>setRandomGenderIndex((randomGenderIndex+1)%randomGenders.length)
                        }>
                            <p className='spacer'>{randomGenders[randomGenderIndex]}</p> 
                            {Icons.ChevronIcon}
                        </button>
                    </div>
                    <div className='spacer'></div>
                    <p className='newRateDesc'>Search for an existing name, or add a new one</p>
                    <button id='searchName' className='newRate'>{Icons.SearchIcon}</button>
                    <div className='spacer'></div>
                </div>
            </section>
        </div>
    );
}

export default App;

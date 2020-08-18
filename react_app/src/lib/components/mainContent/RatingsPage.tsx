import React from 'react';
import {
    SetState, Dispatch, 
    Ref, getRatingsGetIsMore, 
    messageStrToJSON, PageAction
} from '../../Utilities';
import { Rating, FilterObj } from './MainPageUtilities';

import Icons from '../../Icons';
import $ from 'jquery';
import {Rate, DynamicRating} from '../../Ratings';
import UserObject from '../../UserObject';
import { useHistory, match as RouterMatch } from 'react-router-dom';


const GetRatingFilterIcon = (str: string): JSX.Element => {
    let dic: {[key: string]: JSX.Element} = {
        desc: Icons.ArrowDownIcon,
        asc: Icons.ArrowUpIcon
    }
    return dic[str] ? dic[str] : <p className='ratingFilterIcon centerAll'>{str}</p>;
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

export function RatingsFilter({filterObj}: {filterObj: FilterObj}){

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
/*
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
    }*/

    let getRatingsSetIsMore =  async (filter: string, subFilter: string, range: number, rangeStart: number): Promise<Rate[]> => {
        let searchTerm = searchRef.current ? searchRef.current!.value : '';
        let {ratings, isMore}: {ratings: Rate[], isMore: boolean} = await getRatingsGetIsMore(
            filter, subFilter, range, rangeStart, searchTerm
        );

        setIsMore(isMore);
        return ratings;
    }

    let setRatingSetIsMore = (filter: string, subFilter: string, range: number, rangeStart: number): void => {
        setRatings([]);
        setIsMore(false);
        getRatingsSetIsMore(filter, subFilter, range, rangeStart).then(setRatings);
    }

    let [showSettings, setShowSettings]: [boolean, SetState<boolean>] = React.useState(false as boolean);
    let [filter, setFilter]: [string, SetState<string>] = React.useState('avg rating');
    let [subFilter, setSubFilter]: [string, SetState<string>] = React.useState('desc');

    React.useEffect(()=>{
        setRatingSetIsMore(filter, subFilter, ResultsAtATime, 0);
    }, [filter, subFilter]);

    React.useEffect(()=>{

        setRatingSetIsMore(filter, subFilter, ResultsAtATime, 0);
        
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
                    setRatingSetIsMore(filter, subFilter, ratingsLength!, 0);

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
        <div id='ratingsPage' className='col spacer'>
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
            <div id='ratingsTableContainer' className='col spacer'>
                {showSettings ? 
                    <div>
                        <RatingsFilter filterObj={filterObj}/>
                    </div> : null
                }
                {(ratings.length == 0) ? Icons.LoadingIcon : 
                    ratings.map((nameObj)=>{
                        return <Rating key={JSON.stringify(nameObj)} pageDispatch={pageDispatch} nameObj={nameObj}/>
                    })
                }
                {isMore ? showMoreButton : ''}
            </div>
        </div>
    )
}

export default RatingsPage;
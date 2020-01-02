import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import { Date } from 'core-js';
import io from 'socket.io-client';
import axios from 'axios'

const { createApolloFetch } = require('apollo-fetch');
var moment = require('moment');

// const socket = io('http://breezy.club:4200');


const fetch = createApolloFetch({
  uri: 'http://breezy.club:2000/admin/api',
});


class App extends Component {

  constructor() {
    super()

    this.state = {
      population: 0,
      TotalVisit: 0,
      entry_fee: 0,
      eventID: 0,
      eventName: "",
      timestamp: 'no timestamp yet',
      method: "",
      user_entry_num: 0,
      user_updated_At:0,
      wopAvailable: 0,
      balance: 0
    }

    this.handleIncrement = this.handleIncrement.bind(this);
    this.handleDecrement = this.handleDecrement.bind(this);
    this.startScanning = this.startScanning.bind(this)

    // this.subscribeToTimer((err, population) => this.setState({ 
    //   population:  population
    // }));

  }

  componentDidMount() {
    this.getEventInfo()
    this.startScanning()
    // this.getrfid()
    // socket.on('connect', function(data) {
    //   socket.emit('join', 'Hello World from client');
    //   console.log("Connected")
    // });

  }

  startScanning = () => {

    let GLOBAL = this
    console.log("reading RFID")


     let 
    //  getBreezerURL = "http://breezy.club:2001/testBreezer",  // TESTING
    getBreezerURL = "http://breezy.club:2002/readBreezer",
        getUserURL = 'http://breezy.club:2000/management/validateBreezer'

    axios.get(getBreezerURL).then(response => {
        console.log(response)

        axios.post(getUserURL, {
            rfid: response.data.rfid,
        }).then(res => {

            console.log("User validate", res.data.allRFID)

            GLOBAL.setState({ // TODO: update this to what the API sends back- user_id, status, balance, entry
                method: res.data.method,
                idField: res.data.allRFID.cardID,
                balance: res.data.allRFID.balance,
                wopAvailable: res.data.allRFID.wopAvailable,
                user_entry_num : res.data.allRFID.entry,
                user_updated_At: res.data.allRFID.updatedAt,
            }, 

            this.startScanning())

        console.log(res.data.allRFID.updatedAt)


            var updateDate = moment(res.data.allRFID.updatedAt)
        var todayDate = moment()

        var entryNum = res.data.allRFID.entry;

        var timeDifference = moment.duration(todayDate.diff(updateDate)).minutes()
console.log("timeDiff", timeDifference)
       
if(timeDifference > 1){


          fetch({
            query: `mutation {
              updateRFID( id: "${res.data.allRFID.id}", data: {entry: ${res.data.allRFID.entry +1}}){
                id
                entry
              }
            }`,
            // variables: { id: 1 },
          }).then(allEvents => {
console.log(allEvents.data)
this.setState({entryNum: allEvents.data.entry}, ()=>{
            //TODO: do even odd logic
            if(entryNum != 0 && entryNum % 2 == 0){
              //EVEN ENTRY- going out. decrement
              this.handleDecrement()
            }else {
              //odd ENTRY- going in. increment without population increase
              
              this.setState({TotalVisit : this.state.TotalVisit - 1}, this.handleIncrement())
            }
}
  
  )
          }).catch(e=>{
console.log(e)
          })


        } else {
          this.setState({
            method : "Just scanned user" + res.data.method
          })
        }

        }).catch(errRes => {
            console.log('user not found error',errRes)
            let response = errRes.response

            GLOBAL.setState({
                method: "Invalid account. Transaction room.",
                idField: "0",
                balance: "0",
                wopAvailable: "0"
            }, 
            this.startScanning()
            )

        })

    }).catch(e => {
        console.log(e)
        //TODO: if status is UID-error. Or maybe not- since if it wasn't 
    })
}

  // listenToSocket = () =>{

  // }

  // subscribeToTimer(cb) {
  //   socket.on('timer', timestamp => cb(null, timestamp));
  //   socket.emit('subscribeToTimer', 1000);
  // }


//TODO: impement socket.io

  getEventInfo=() =>{
    
    
    fetch({
      query: `query
        {
          allEvents{
            name
            id
            posted
            Population
            totalVisits
          }
          }`,
      // variables: { id: 1 },
    }).then(allEvents => {
      let todayEvent = allEvents.data.allEvents.filter(event => {

        // console.log(event)
        // console.log(event.posted)

        var eventDate = moment(event.posted)
        var todayDate = moment()

        // console.log(eventDate, todayDate)
//TODO: compare end time + 2 hours
        return todayDate.date() == eventDate.date() && todayDate.month() == eventDate.month() && todayDate.year() == eventDate.year()
      })

      console.log(todayEvent)
      todayEvent = todayEvent[0]

      if(todayEvent){
        this.setState({
          eventName: todayEvent.name,
          population: todayEvent.Population,
          // TotalVisit: todayEvent.totalVisits,
          // entry_fee: todayEvent.entry_fee,
          eventID: todayEvent.id
        })
      }


    });
  }

  handleIncrement() {
    const { population, TotalVisit } = this.state;

    console.log("handling inc")

    this.setState({
      population: population + 1,
      TotalVisit: TotalVisit + 1
    }, () =>{
      fetch({
        query: `
    mutation{
      updateEvent (id: "${this.state.eventID}",
       data:{Population:${this.state.population}, totalVisits: ${this.state.TotalVisit}}){
        id
        posted
        entry_fee
        Population
        totalVisits
      }
    }
  `
      }).then(stat => {
        console.log("Updated population and date", stat.data)
      }).catch(e => {
        console.log(e)
      });
    });


    
  }

  handleDecrement() {
    const { population } = this.state;

console.log("handling dec")

    if(population >0){
      this.setState({
        population: population - 1
      }, ()=>{
        fetch({
          query: `
      mutation{
        updateEvent (id: "${this.state.eventID}",
         data:{Population:${this.state.population}}){
          id
          posted
          entry_fee
          Population
          totalVisits
        }
      }
    `
        }).then(stat => {
          console.log("Updated population and date", stat.data)
        }).catch(e => {
          console.log(e)
    
        });
      });
    }
   

    
  }


  render() {

    let { population, entry_fee, timestamp , method, wopAvailable, balance} = this.state;

    const fakePop =20;

    if(population > 30)
{population = population + fakePop}

    console.log(population)
    return (
      <div className="App">

        <div >
          <h1 className="eventName">  {method}</h1>
        </div>

        <div className="eventInfo">
          <button className="location-button" onClick={this.handleIncrement}>
            Entered
        </button>
          <h2>Event Population: {population}</h2>


          <button className="location-button" onClick={this.handleDecrement}>
            Left
        </button>
         
        </div>

        <div className="eventStats">
        <h3>balance: {balance}</h3>
    <h3>wopAvailable: {wopAvailable}</h3>
        <button className="location-button" onClick={this.handleRefresh}>
            Refresh
        </button>
        </div>

      </div>
    );
  }
}

export default App;

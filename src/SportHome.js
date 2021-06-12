import axios from "axios";
import React, { useState, useEffect } from "react";
import DateFnsUtils from "@date-io/date-fns"; // choose your lib
import {
  KeyboardDatePicker,
  MuiPickersUtilsProvider,
} from "@material-ui/pickers";
import moment from "moment";
import { Container, Grid, Paper } from "@material-ui/core";
import ArrowBackIosIcon from "@material-ui/icons/ArrowBackIos";
import ArrowForwardIosIcon from "@material-ui/icons/ArrowForwardIos";
import Slider from "@material-ui/core/Slider";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";

import { makeStyles } from "@material-ui/core/styles";
import {calculateInterest,getScore,getEvents,getDateFromParam,getSportFromParam} from "./Functions"
import {SPORTS_ENUM} from "./Sports"

const useStyles = makeStyles((theme) => ({
  formControl: {
    margin: theme.spacing(1),
    minWidth: 300,
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  },
  header:{
    padding:"10px",
    // backgroundColor:"lightblue",
    minHeight:"100vh"
  }
}));



function SportHome() {
  const classes = useStyles();
  const [cancelToken, setCancelToken] = useState(axios.CancelToken.source());
  const [selectedDate, handleDateChange] = useState();
  const [events, setEvents] = useState({});
  const [displayScores, setDisplayScores] = useState([]);
  const [interestMargin, setInterestMargin] = useState({
    defaultHigh: 0.1,
    high: 0.1,
    mild: 0.2,
  });
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [activeSport, setActiveSport] = useState(SPORTS_ENUM.nfl);
  const SPORT_ESPN_LINK = activeSport.link;
  useEffect(() => {
    const queryString = window.location.search;
    console.log("params: ", queryString);
    const urlParams = new URLSearchParams(queryString);

    getDateFromParam(urlParams,handleDateChange)
    getSportFromParam(urlParams,setActiveSport)

    
  }, []);

  useEffect(() => {
    setLoadingEvents(true);
    setEvents({});
    if (!selectedDate || isNaN(selectedDate.getTime())) {
      cancelToken.cancel("user requested events");
      setLoadingEvents(false);
      return;
    }

    const formattedDate = moment(selectedDate)
      .subtract(1, "day")
      .format("YYYYMMDD");

    //cancel previous requests
    cancelToken.cancel("user requested events for " + formattedDate);
    const newCancelToken = axios.CancelToken.source();
    setCancelToken(newCancelToken);
    
    getEvents(formattedDate,SPORT_ESPN_LINK,newCancelToken,interestMargin,setLoadingEvents,setEvents)
  }, [selectedDate, activeSport]);

  useEffect(() => {
    Object.keys(events).forEach((key) => {
      const updatedEvent = events[key];
      if (updatedEvent.data) {
        updatedEvent.data["interest"] = calculateInterest(
          updatedEvent.data.winprobability,
          interestMargin.high,
          interestMargin.mild
        );
        setEvents((prev) => ({ ...prev, [key]: updatedEvent }));
      }
    });
  }, [interestMargin]);

  return (
    <Grid
      container
      spacing={0}
      direction="column"
      justify="flex-start"
      alignItems="flex-start"
      className={classes.header}
    >
      <Grid container xs={12}  direction="row">
      <Grid item xs={4}>
        <FormControl className={classes.formControl}>
          <InputLabel id="demo-simple-select-label">Sport</InputLabel>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={activeSport.name}
            renderValue={() => activeSport.name}
            onChange={(event) => {
              setActiveSport(event.target.value);
            }}
          >
            {/* TODO make this dynamic */}
            {/* {Object.keys(SPORTS_ENUM).map((v)=>{
            console.log(v);
            return <MenuItem value={v.id}>huh{v.name}</MenuItem>
          })}
           */}
            <MenuItem value={SPORTS_ENUM.nba}>{SPORTS_ENUM.nba.name}</MenuItem>
            <MenuItem value={SPORTS_ENUM.nfl}>{SPORTS_ENUM.nfl.name}</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={4}>
        <button
          onClick={() =>
            handleDateChange(moment(selectedDate).subtract(1, "day").toDate())
          }
        >
          <ArrowBackIosIcon />
        </button>
        <MuiPickersUtilsProvider utils={DateFnsUtils}>
          <KeyboardDatePicker
            disableToolbar
            variant="inline"
            format="dd/MM/yyyy"
            margin="normal"
            id="date-picker-inline"
            label="Date picker inline"
            value={selectedDate}
            onChange={handleDateChange}
            KeyboardButtonProps={{
              "aria-label": "change date",
            }}
          />
        </MuiPickersUtilsProvider>
        <button
          onClick={() =>
            handleDateChange(moment(selectedDate).add(1, "day").toDate())
          }
        >
          <ArrowForwardIosIcon />
        </button>
      </Grid>
      <Grid item xs={4}>
        <DisplayInterestSlider
          interestMargin={interestMargin}
          setInterestMargin={setInterestMargin}
        />
      </Grid>
      </Grid>
      
      {loadingEvents ? (
        "Loading.."
      ) : (
        <Grid container item xs={12}>
          {selectedDate && !isNaN(selectedDate.getTime()) && (
            
              
                <h2>
                  Results for: {moment(selectedDate).format("DD/MM/YYYY")} (NZ
                  time)
                </h2>
          )}
          
            <DisplayEvents
              events={events}
              displayScores={displayScores}
              setDisplayScores={setDisplayScores}
              activeSport={activeSport}
            />
          
        </Grid>
      )}
    </Grid>
  );
}

const DisplayInterestSlider = ({ date, interestMargin, setInterestMargin }) => {
  return (
    <div>
      Set interest range (lower number means closer game)
      <Slider
        defaultValue={interestMargin.defaultHigh}
        step={0.001}
        marks
        min={0.001}
        max={0.5}
        valueLabelDisplay="auto"
        onChange={(event, val) => {
          setInterestMargin((prev) => ({ ...prev, high: val }));
        }}
      />
    </div>
  );
};
const DisplayEvents = ({
  events,

  displayScores,
  setDisplayScores,

  activeSport,
}) => {
  return (
    <Grid container item xs={12}>
      {Object.keys(events).length > 0
        ? Object.keys(events).map((key) => {
            return (
              <Grid item xs={4}>
                <DisplayEvent
                  key={events[key].id}
                  event={events[key]}
                  displayScores={displayScores}
                  setDisplayScores={setDisplayScores}
                  activeSport={activeSport}
                />
              </Grid>
            );
          })
        : "No events"}
    </Grid>
  );
};

const DisplayEvent = ({
  event,
  displayScores,
  setDisplayScores,
  activeSport,
}) => {
  const now = new Date();
  return (
    <Paper elevation={3} style={{ padding: "10px", margin: "10px" }}>
      <h3>{event.name}</h3>
      <p>
        {event.status.type.description} - {event.status.type.detail} as of{" "}
        {moment(now).format("h:mmA")}
      </p>
      {event.status.type.name !== "STATUS_SCHEDULED" && (
        <DisplayEventScores
          id={event.id}
          data={event.data}
          displayScores={displayScores}
          setDisplayScores={setDisplayScores}
          activeSport={activeSport}
        />
      )}
    </Paper>
  );
};

const DisplayEventScores = ({
  id,
  data,
  displayScores,
  setDisplayScores,
  activeSport,
}) => {
  return data ? (
    <Grid>
      <Grid item xs={6}>
        <p>
          {data.interest.highInterest
            ? "highInterest"
            : data.interest.mildInterest
            ? "mild"
            : "no interest"}
        </p>
      </Grid>
      <Grid item xs={6}>
        {!displayScores.includes(id) ? (
          <button
            onClick={() => {
              setDisplayScores((prev) => [...prev, id]);
            }}
          >
            Display Scores
          </button>
        ) : (
          getScore(data, activeSport).awayScore +
          " - " +
          getScore(data, activeSport).homeScore
        )}
      </Grid>
    </Grid>
  ) : (
    "loading"
  );
};

export default SportHome;

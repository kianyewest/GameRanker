import axios from "axios";
import React, { useState, useEffect } from "react";
import DateFnsUtils from "@date-io/date-fns"; // choose your lib
import {
  KeyboardDatePicker,
  MuiPickersUtilsProvider,
} from "@material-ui/pickers";
import moment from "moment";
import { Grid, Paper, Switch } from "@material-ui/core";
import ArrowBackIosIcon from "@material-ui/icons/ArrowBackIos";
import ArrowForwardIosIcon from "@material-ui/icons/ArrowForwardIos";
import Slider from "@material-ui/core/Slider";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";
import IconButton from "@material-ui/core/IconButton";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import {
  calculateInterest,
  getScore,
  getEvents,
  getDateFromParam,
  getSportFromParam,
} from "./Functions";
import { SPORTS_ENUM } from "./Sports";

import { LineChart, Line } from 'recharts';

const useStyles = makeStyles((theme) => ({
  formControl: {
    margin: theme.spacing(1),
    minWidth: 300,
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  },
  header: {
    padding: "10px",
    // backgroundColor:"lightblue",
    minHeight: "100vh",
  },
}));

function SportHome() {
  const classes = useStyles();
  const [cancelToken, setCancelToken] = useState(axios.CancelToken.source());
  const [selectedDate, handleDateChange] = useState();
  const [events, setEvents] = useState({});
  const [displayAllScores,setDisplayAllScores] = useState(false)
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

    getDateFromParam(urlParams, handleDateChange);
    getSportFromParam(urlParams, setActiveSport);
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

    getEvents(
      formattedDate,
      SPORT_ESPN_LINK,
      newCancelToken,
      interestMargin,
      setLoadingEvents,
      setEvents
    );
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
      <Grid
        container
        direction="row"
        justify="flex-start"
        alignItems="flex-end"
      >
        <Grid item xs={12} lg={4}>
          <FormControl className={classes.formControl}>
            <InputLabel id="demo-simple-select-label">Sport</InputLabel>
            <Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              value={activeSport.name}
              renderValue={() => activeSport.name}
              onChange={(event) => {
                setActiveSport(SPORTS_ENUM[event.target.value]);
              }}
            >
              {Object.keys(SPORTS_ENUM).map((sportID) => {
                return (
                  <MenuItem value={SPORTS_ENUM[sportID].id} key={SPORTS_ENUM[sportID].id}>
                    {SPORTS_ENUM[sportID].id}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Grid>
        <Grid container item xs={12} lg={4} alignItems="flex-end">
          <IconButton
            aria-label="delete"
            onClick={() =>
              handleDateChange(moment(selectedDate).subtract(1, "day").toDate())
            }
          >
            <ArrowBackIosIcon />
          </IconButton>
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

          <IconButton
            aria-label="delete"
            onClick={() =>
              handleDateChange(moment(selectedDate).add(1, "day").toDate())
            }
          >
            <ArrowForwardIosIcon />
          </IconButton>
        </Grid>
        <Grid item xs={12} lg={4}>
          <DisplayInterestSlider
            interestMargin={interestMargin}
            setInterestMargin={setInterestMargin}
          />
        </Grid>
        <Grid item xs={12} lg={4}>
        <Switch
        checked={displayAllScores}
        onChange={(event)=>{setDisplayAllScores(event.target.checked)}}
        name="checkedA"
        inputProps={{ 'aria-label': 'secondary checkbox' }}
      />
        </Grid>
      </Grid>

      {loadingEvents ? (
        "Loading.."
      ) : (
        <Grid container item xs={12}>
          {selectedDate && !isNaN(selectedDate.getTime()) && (
            <h2>
              Results for: {moment(selectedDate).format("DD/MM/YYYY")} (NZ time)
            </h2>
          )}

          <DisplayEvents
            events={events}
            displayScores={displayScores}
            setDisplayScores={setDisplayScores}
            activeSport={activeSport}
            displayAllScores={displayAllScores}
          />
        </Grid>
      )}
     
    </Grid>
  );
}

const DisplayInterestSlider = ({ date, interestMargin, setInterestMargin }) => {
  const max = 0.5;
  const min=0.001;
  
  
  return (
    <div style={{ paddingRight: "50px" }}>
      <Typography id="continuous-slider" gutterBottom>
        Interest Level
      </Typography>{" "}
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
  displayAllScores
}) => {
  return (
    <Grid container item xs={12}>
      {Object.keys(events).length > 0
        ? Object.keys(events).map((key) => {
            return (
              <Grid item xs={12} lg={4} key={events[key].id}>
                <DisplayEvent
                  event={events[key]}
                  displayScores={displayScores}
                  setDisplayScores={setDisplayScores}
                  activeSport={activeSport}
                  displayAllScores={displayAllScores}
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
  displayAllScores
}) => {
  console.log("event: ",event)
  return (
    <Paper elevation={3} style={{ padding: "10px", margin: "10px" }}>
      <h3>{event.name}</h3>
      <p>
        {event.status.type.description} - {event.status.type.detail} as of{" "}
        {moment(new Date()).format("h:mmA")}
      </p>
      {event.status.type.name !== "STATUS_SCHEDULED" && (
        <DisplayEventScores
          id={event.id}
          data={event.data}
          displayScores={displayScores}
          setDisplayScores={setDisplayScores}
          activeSport={activeSport}
          displayAllScores={displayAllScores}
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
  displayAllScores
}) => {
  const [graphVal,setGraphVal] = useState([])
  const [graphValA,setGraphValA] = useState([])
  if(data){
  console.log("data",data)
  const homeWinPercentage = data.winprobability.map((item)=>{return {uv:item.homeWinPercentage}})
  console.log(homeWinPercentage)
  
  }
  console.log(graphVal)
  const graphData = [
    {
      name: 'Page A',
      uv: 0,

    },
    {
      name: 'Page B',
      uv: 2,
     
    },
    {
      name: 'Page C',
      uv: 0,
      
    }
  ];
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
        {(!displayScores.includes(id) && !displayAllScores)? (
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
        <p>{graphVal.length>0 && graphVal[1]}</p>

        <p>{graphValA.length>0 && graphValA[1]}</p>
        <LineChart width={400} height={400} data={data.winprobability.map((item)=>{return {team:item.homeWinPercentage,zero:0.5}})}>
    <Line type="monotone" dataKey="team" stroke="#8884d8" />
    <Line type="monotone" dataKey="zero" stroke="#8884d8" />
  </LineChart>
        {/* {data && <LineGraph fillBelow={'rgba(200,67,23,0.1)'}
  hover={true} gridX={true} data={[]} gridY={true} onHover={(v)=>{setGraphVal(v)}} accent={'palevioletred'}  data={data.winprobability.map(item=>0.5-item.homeWinPercentage)}/>}
        {data && <LineGraph fillBelow={'rgba(200,67,23,0.1)'}
  hover={true} gridX={true} gridY={true} onHover={(v)=>{setGraphValA(v)}} accent={'palevioletred'} data={data.winprobability.map(item=>item.homeWinPercentage)}/>} */}
      </Grid>
    </Grid>
  ) : (
    "loading"
  );
};



export default SportHome;

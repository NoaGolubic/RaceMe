//STVARANJE SOBE, PRIJAVA KORISNIKA U SOBU, DOJAVA LOKACIJE, PREUZIMANJE SVIH LOKACIJA/PRIKAZ, ZAPIS KADA JE KORISNIK PREŠAO CRTU, ROUTING
//npm install --save leaflet-routing-machine, ciscenje watcha i intervala
//dodani badgevi, soundefekti za omjer vremena
//dodani join i create room
//Slozen Supabse Backend
//Dodan leaderboards za room

import { createSignal, onMount, createEffect, Show, onCleanup } from "solid-js";
import { until } from "@solid-primitives/promise";
import L, { control, icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import { StopChannel, StartChannel, Participants, rankUser, setLeaderboardUpdated, leaderboardUpdated, setUserCoordsUpdate, UserCoordsUpdate, channelReady } from "../Backend/ChannelHelper";
import { GetRoomFinishLine, DeleteUserFromRoom, InsertCreatedRoom, InsertUserInRoom, UpdateUserLocation, AddUserToLeaderboard, countUserRoomEntries } from "../Backend/DatabaseCalls";
import { useAuth } from "../Auth/SupabaseAuthProvider";

//MEDIA
import EASY from "../assets/EASY.jpg";
import MEDIUM from "../assets/MEDIUM.jpg";
import HARD from "../assets/HARD.jpg";
import EXTRAHARD from "../assets/EXTRAHARD.jpg";
import FINISH_ICON from "../assets/FINISH_ICON.png";
import STARTLINE_ICON from "../assets/STARTLINE_ICON.png";
import helmet_player from "../assets/helmet_player.png";
import helmet_enemy from "../assets/helmet_enemy.png";
import DBadge from "../assets/DBadge.jpg";
import HDBadge from "../assets/HDBadge.jpg";
import SBadge from "../assets/SBadge.jpg";
import WSBadge from "../assets/WSBadge.jpg";
import BotttomFeader from "../assets/BottomFeader.mp3";
import Dominating from "../assets/Dominating.mp3";
import HumiliatingDefeat from "../assets/HumiliatingDefeat.mp3";
import Slay from "../assets/Slay.mp3";
import WickedSick from "../assets/WickedSick.mp3";

export default function coDriver() {

  const [GForce, setGForce] = createSignal(0);

  const [NewCoords, setNewCoords] = createSignal(false);
  const [finishLat, setFinishLat] = createSignal(null);
  const [finishLong, setFinishLong] = createSignal(null);
  const [userLat, setUserLat] = createSignal(null);
  const [userLon, setUserLon] = createSignal(null);
  const [markerMoved, setMarkerMoved] = createSignal(false);

  const [stopWatchValue, setStopWatchValue] = createSignal(0);
  const [raceFinished, setRaceFinished] = createSignal(false);                     //true
  const [startLat, setStartLat] = createSignal(0);
  const [startLon, setStartLon] = createSignal(0);
  const [inRoom, setInRoom] = createSignal(false);
  const [instructionWaSpoken, setInstructionWasSpoken] = createSignal(false);
  const [loopOnce, setLoopOnce] = createSignal(true);
  const [stop, setStop] = createSignal(false);
  const [instructionRoute, setInstructionRoute] = createSignal([]);
  const [speedSig, setSpeed] = createSignal(0);
  const [distanceToFinishLine, setDistanceToFinishLine] = createSignal(0);
  const [stopLogicRouteRefresh, setStopLogicRouteRefresh] = createSignal(false);

  const [CalcAccDif, setCalcAccDif] = createSignal(0);
  const [CalcHeaDif, setCalcHeaDif] = createSignal(0);
  const [CalcSpeAvg, setCalcSpeAvg] = createSignal(0);
  const [MaxSpeed, setMaxSpeed] = createSignal(0);
  const [TrackHardnessFactor, setTrackHardnessFactor] = createSignal(0);
  const [UserTimeGrade, setUserTimeGrade] = createSignal(0);


  let AccelerationData;
  let SpeedArray = [];
  let HeadingArray = [];
  let AccerationArray = [];
  let instruction = [];

  var totalTime;
  let UserWatchId;
  let countPlayers = 0;
  let token = "";
  let EnteredRoomCode = "";

  let x;
  let y;

  let map;
  let route;
  let routeLogic;
  let instructionIndexArray = [];

  const session = useAuth();

  const userMarkersGroup = L.layerGroup();
  const finishMarkersGroup = L.layerGroup();
  const enemyMarkersGroup = L.layerGroup();

  var Start_icon = L.icon({
    iconUrl: STARTLINE_ICON,
    iconSize: [40, 40]
  });

  var Finish_icon = L.icon({
    iconUrl: FINISH_ICON,
    iconSize: [40, 40]
  });

  var Enemy_icon = L.icon({
    iconUrl: helmet_enemy,
    iconSize: [28, 28]
  });

  var Player_icon = L.icon({
    iconUrl: helmet_player,
    iconSize: [28, 28]
  });

  //SPEECHAPI MOZDA STAVITI U ASYNC
  let PaceNote;
  let PaceNoteReading = new SpeechSynthesisUtterance();
  speechSynthesis.onvoiceschanged = () => {
    let voices = speechSynthesis.getVoices();
    PaceNoteReading.voice = voices.find(voice => voice.name === "Microsoft Aria Online (Natural) - English (United States)" && voice.lang === "en-US");
    PaceNoteReading.pitch = 1.2;
    PaceNoteReading.rate = 1.2;
  }

  const acl = new Accelerometer({ frequency: 20 });
  acl.addEventListener("reading", () => {
    AccelerationData = Math.abs(Math.sqrt(acl.x * acl.x + acl.y * acl.y + acl.z * acl.z));
    AccerationArray.push(AccelerationData);
    setGForce(AccelerationData / 9.81);
  });

  //IZLAZAK IZ SOBE
  //MAKIVANJE KANALA, GASENJE STOPERICA, CISCENJE MAPE, BRISANJE IZ SOBE
  //POSLOZITI SCOPE
  async function LeaveRoom() {
    if (routeLogic) {
      map.removeControl(routeLogic);
    }
    if (route) {
      map.removeControl(route);
    }
    clearInterval(x);
    clearInterval(y);
    finishMarkersGroup.clearLayers();
    userMarkersGroup.clearLayers();
    enemyMarkersGroup.clearLayers();
    let codeValue = document.getElementById("ShowRoomCode").value;
    document.getElementById("ShowRoomCode").value = "";
    StopChannel();
    Participants.delete(session().user?.user_metadata?.username);
    await DeleteUserFromRoom(codeValue, session().user.id);
    setInRoom(false);
    document.getElementById("CreatButton").disabled = false;
  }


  async function CreateARoom() {
    var randToken = function () {
      return Math.random().toString(36).substr(2, 10);
    };
    //Nastanak sobe i korisnik se pridružuje
    if (finishLat() && finishLong() && speedSig() < 5) {
      token = randToken();
      document.getElementById("ShowRoomCode").value = token;
      await StartChannel(token);
      await until(() => channelReady());
      await InsertCreatedRoom(finishLat(), finishLong(), token, session().user?.user_metadata?.username, session().user.id, userLat(), userLon());
      document.getElementById("CreatButton").disabled = true;
      finishMarkersGroup.clearLayers();
      const marker = L.marker([finishLat(), finishLong()], { icon: Finish_icon }).addTo(finishMarkersGroup);
      setInRoom(true);
    } else {
      alert("SET THE FINISHLINE MARKER TO CREATE A ROOM!!!");
    }
  }


  async function JoinRoom(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    EnteredRoomCode = formData.get("EnteredRoomCode");

    //Ulaz u sobu
    if (EnteredRoomCode) {
      const count = await countUserRoomEntries(EnteredRoomCode);
      //data?
      if (count > 0) {
        if (routeLogic) {
          map.removeControl(routeLogic);
        }
        if (route) {
          map.removeControl(route);
        }
        finishMarkersGroup.clearLayers();
        const data = await GetRoomFinishLine(EnteredRoomCode);
        setFinishLat(data[0].FinishLineLat);
        setFinishLong(data[0].FinishLineLong);
        await StartChannel(EnteredRoomCode);
        await until(() => channelReady());
        await InsertUserInRoom(session().user?.user_metadata?.username, session().user.id, userLat(), userLon(), EnteredRoomCode, data[0].FinishLineLat, data[0].FinishLineLong);

        setInRoom(true);
        document.getElementById("ShowRoomCode").value = EnteredRoomCode;
        const marker = L.marker([finishLat(), finishLong()], { icon: Finish_icon }).addTo(finishMarkersGroup);
      } else {
        alert("Room DOESNT exist!");
      }
    }
  }


  onMount(() => {
    if (UserWatchId) {
      navigator.geolocation.clearWatch(UserWatchId);
    }

    UserWatchId = navigator.geolocation.watchPosition(UserWatch);

    let mapa = document.getElementById("map");


    if (map) {
      map.remove();
    }

    if (mapa) {
      map = L.map('map').setView([/*userLat()*/45, /*userLon()*/ 16], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
      }).addTo(map);
    }

    userMarkersGroup.addTo(map);
    finishMarkersGroup.addTo(map);
    enemyMarkersGroup.addTo(map);

    map.on('click', (e) => {
      const markersCount = finishMarkersGroup.getLayers().length;
      //Postavljanje koordinata finisha na dodir

      if (markersCount < 1) {
          const marker = L.marker(e.latlng, { icon: Finish_icon }).addTo(finishMarkersGroup);
          setFinishLat(e.latlng.lat);
          setFinishLong(e.latlng.lng);
          setMarkerMoved(true);
        return;
      }
      finishMarkersGroup.clearLayers();
        });


    createEffect(async () => {

      if (leaderboardUpdated()) {
        const leaderboardsEntry = Array.from(rankUser.keys()).pop();
        const userFinishedData = rankUser.get(leaderboardsEntry);

        const leaderBoardsTableInsert = document.getElementById("LeaderBoardsTable");

        const newTableRow = document.createElement("tr");
        newTableRow.classList.add("odd:bg-gray-900", "even:bg-gray-800", "border-b border-gray-700");
        leaderBoardsTableInsert.appendChild(newTableRow);

        const rankTd = document.createElement("td");
        rankTd.classList.add("px-6", "py-4");
        rankTd.textContent = userFinishedData.position;

        const usernameTd = document.createElement("td");
        usernameTd.classList.add("px-6 py-4", "font-medium", "text-white");
        usernameTd.textContent = leaderboardsEntry;

        const timeTd = document.createElement("td");
        timeTd.classList.add("px-6", "py-4", "font-medium", "text-white");
        timeTd.textContent = userFinishedData.finishTime;

        const topSpeedTd = document.createElement("td");
        topSpeedTd.classList.add("px-6", "py-4");
        topSpeedTd.textContent = userFinishedData.carTopSpeed;

        newTableRow.append(rankTd, usernameTd, timeTd, topSpeedTd);

        rankUser.clear();
        setLeaderboardUpdated(false);
      }



      if (NewCoords() || markerMoved()) {

        //LOGIČKA RUTA
        if ((NewCoords() || markerMoved() || instructionWaSpoken()) && finishLat() && finishLong() && !stopLogicRouteRefresh()) {
          if (routeLogic) {
            map.removeControl(routeLogic);
          }
          routeLogic = L.Routing.control({
            waypoints: [
              L.latLng([userLat(), userLon()]),
              L.latLng([finishLat(), finishLong()])
            ],
            lineOptions: {
              styles: [{ color: 'transparent', opacity: 0, weight: 0 }],
              addWaypoints: false
            }, createMarker: function () { return null; }
          })
            .on('routeselected', function (e) {
              instruction = e.route.instructions;
            })
            .on('routesfound', function (e) {
              var routes = e.routes;
              if (instructionIndexArray.length > 0) {
                const filteredInstr = routes[0].instructions.filter(
                  item => !instructionIndexArray.includes(item.index)
                );
                if (filteredInstr.length !== 0) {
                  setInstructionRoute(filteredInstr);
                } else {
                  setStopLogicRouteRefresh(true);
                }
              } else {
                setInstructionRoute(routes[0].instructions);
              }
            })
            .addTo(map);

          const routingControlContainer = routeLogic.getContainer();
          const controlContainerParent = routingControlContainer.parentNode;
          controlContainerParent.removeChild(routingControlContainer);

        }
        userMarkersGroup.clearLayers();
        L.marker([userLat(), userLon()], { icon: Player_icon })
          .addTo(userMarkersGroup)
          .bindPopup('You are here!')
        setNewCoords(false);
                console.log("MAPA SE IZRAČUNALA!");

            }

      //PRIKAZ KOORDINATA PROTIVNIKA
      if (UserCoordsUpdate()) {
        enemyMarkersGroup.clearLayers();
        Participants.delete(session().user?.user_metadata?.username);
        Participants.forEach((value, key) => {
          L.marker([value.latitude, value.longitude], { icon: Enemy_icon })
          .addTo(enemyMarkersGroup)
          .bindPopup(key);

        });
        setUserCoordsUpdate(false);
      }

      //RUTA KOJA SE CRTA (UI)
      if (((stop() && finishLat() && finishLong() && startLat() && startLon())) || markerMoved()) {
        if (route) {
          map.removeControl(route);
        }

        route = L.Routing.control({
          waypoints: [
            L.latLng([startLat(), startLon()]),
            L.latLng([finishLat(), finishLong()])
          ], lineOptions: {
            addWaypoints: false
          }, createMarker: function () { return null; }
        }).on('routeselected', function (e) {
          instruction = e.route.instructions;
        }).on('routesfound', function (e) {
          //UZIMA SE SVEUKUONO VRIJEME OD TOČKE A DO TOČKE B
          var routes = e.routes;
          var summary = routes[0].summary;
          totalTime = summary.totalTime;
        }).addTo(map);

        const routingControlContainer = route.getContainer();
        const controlContainerParent = routingControlContainer.parentNode;
        controlContainerParent.removeChild(routingControlContainer);
        setStop(false);


        if (startLat() && startLon()) {
          L.marker([startLat(), startLon()], { icon: Start_icon })
            .bindPopup("Start line")
            .addTo(map);
        }
        setMarkerMoved(false);
        console.log("MAPA SE NACRTALA!");
      }
      // }

      //POKRETANJE UTRKE
      if (!raceFinished() && !instructionWaSpoken() && instructionRoute().length > 0 && speedSig() > 5) {
        function CodriverSpeech(text, time) {
          setInstructionWasSpoken(true);
          PaceNoteReading.text = text;

          setTimeout(() => {
            speechSynthesis.speak(PaceNoteReading);
            PaceNoteReading.onend = () => {
              setInstructionWasSpoken(false);
              console.log("Izgovorilo se", text);
            };
          }, time);
        }

        let currentInstruction = instructionRoute()[0];
        let directionShout = currentInstruction.modifier;
        let distance = currentInstruction.distance;
        let timeDelaySpeech = distance / speedSig() * 1000;
        let instructionIndex = currentInstruction.index;

        if (!instructionIndexArray.includes(instructionIndex) || instructionIndexArray.length === 0) {
          instructionIndexArray.push(instructionIndex);
          switch (directionShout) {

            case "Left":
              PaceNote = Math.trunc(distance) + " meters!" + " left 3!";
              CodriverSpeech(PaceNote, timeDelaySpeech);
              break;

            case "Right":
              PaceNote = Math.trunc(distance) + " meters!" + " right 3!";
              CodriverSpeech(PaceNote, timeDelaySpeech);
              break;

            case "Straight":
              PaceNote = Math.trunc(distance) + " meters!" + " flat out!";
              CodriverSpeech(PaceNote, timeDelaySpeech);
              break;

            case "SlightRight":
              PaceNote = Math.trunc(distance) + " meters!" + " right 4!";
              CodriverSpeech(PaceNote, timeDelaySpeech);
              break;

            case "SharpRight":
              PaceNote = Math.trunc(distance) + " meters!" + " right 2!";
              CodriverSpeech(PaceNote, timeDelaySpeech);
              break;

            case "SharpLeft":
              PaceNote = Math.trunc(distance) + " meters!" + " left 2!";
              CodriverSpeech(PaceNote, timeDelaySpeech);
              break;

            case "SlightLeft":
              PaceNote = Math.trunc(distance) + " meters!" + " left 4!";
              CodriverSpeech(PaceNote, timeDelaySpeech);
              break;

            case "TurnAround":
            case "Uturn":
              PaceNote = Math.trunc(distance) + " meters!" + " turn around!";
              CodriverSpeech(PaceNote, timeDelaySpeech);
              break;

            default:
              PaceNote = " Flat out!";
              CodriverSpeech(PaceNote, timeDelaySpeech);
              break;
          }

        }

      }


      if ((distanceToFinishLine() < 0.0000001) && finishLat() && finishLong() && !raceFinished()) { //10000
        setRaceFinished(true);
        setNewCoords(false);
        let SpeedArrayLenght = SpeedArray.length;
        let HeadingArrayLenght = HeadingArray.length - 1;
        let AccelerationArrayLenght = AccerationArray.length - 1;
        instructionIndexArray = [];

        let sumAcc = 0;
        for (let i = 1; i < AccelerationArrayLenght; i++) {
          sumAcc += Math.abs(AccerationArray[i] - AccerationArray[i - 1]);
        }

        let sumSpe = 0;
        SpeedArray.forEach(numSpe => {
          sumSpe += numSpe;
        });


        let sumHea = 0;
        for (let i = 1; i < HeadingArrayLenght; i++) {
          let checkWrapp = 0;
          checkWrapp = Math.abs(HeadingArray[i] - HeadingArray[i - 1]);
          if (checkWrapp < 180) {
            sumHea += checkWrapp;
          } else {
            sumHea += Math.abs(360 - checkWrapp);
          }
        }


        setCalcAccDif(sumAcc / AccelerationArrayLenght);
        setCalcHeaDif(sumHea / HeadingArrayLenght);
        setCalcSpeAvg(sumSpe / SpeedArrayLenght);
        setMaxSpeed(Math.max(...SpeedArray));

        //Izvući broj trenutačnih prolaznika
        const count = await countUserRoomEntries(token);
        // data ?? 0 
        countPlayers = (count ?? 0) + 1;

        let UserFinishTime = Math.floor(stopWatchValue() / 3600) + ":" + Math.floor((stopWatchValue() % 3600) / 60) + ":" + stopWatchValue() % 60;

        setUserTimeGrade(stopWatchValue() / totalTime);
        await AddUserToLeaderboard(UserFinishTime, count, MaxSpeed, session().user?.user_metadata?.username, token);

        //PITATI ZA CAR TOP SPEED kod reg i spremiti u metadata
        setTrackHardnessFactor(((CalcAccDif * 0.5) + (CalcHeaDif * 0.4) + (CalcSpeAvg /* / carTopSpeed */ * 0.1)) * 100);

        //U SEKUNDAMA
        let TimeGradeConstant = totalTime / stopWatchValue();


        if (TimeGradeConstant > 1.2) {
          document.getElementById('Badge').innerHTML += `<img src="${HDBadge}" height="300" width="300"></img>`;
          var audio = document.getElementById("BottomFeeder");
          audio.play();
        }
        else if (TimeGradeConstant < 1.2 && TimeGradeConstant >= 0.9) {
          document.getElementById('Badge').innerHTML += `<img src="${SBadge}" height="300" width="300"></img>`;
          var audio = document.getElementById("Slay");
          audio.play();
        }

        else if (TimeGradeConstant < 0.9 && TimeGradeConstant >= 0.5) {
          document.getElementById('Badge').innerHTML += `<img src="${DBadge}" height="300" width="300"></img>`;
          var audio = document.getElementById("Dominating");
          audio.play();
        }

        else {
          document.getElementById('Badge').innerHTML += `<img src="${WSBadge}" height="300" width="300"></img>`;
          var audio = document.getElementById("WickedSick");
          audio.play();
        }

        alert("Došli ste do cilja!");

        navigator.geolocation.clearWatch(UserWatchId);

        clearInterval(x);
        clearInterval(y);
        acl.stop();
      }
    });
  });

  //PROVJERIT JEL SE SVE DOHVACA
 /* async*/ function UserWatch(pos) {
    if (!raceFinished()) {

      const { accuracy, latitude, longitude, heading, speed } = pos.coords;
      acl.start();

      setSpeed(speed);

      let DistToFinishLine = Math.sqrt(Math.pow(finishLat() - latitude, 2) + Math.pow(finishLong() - longitude, 2));
      setDistanceToFinishLine(DistToFinishLine);
      if (DistToFinishLine > 0.0001) {
        if (loopOnce()) {
          setStop(true);
          setStartLat(latitude);
          setStartLon(longitude);
        }
        setUserLat(latitude);
        setUserLon(longitude);

        if (speedSig() > 5) {
          if (x) clearInterval(x);
          if (y) clearInterval(y);
          function incrementStopWatch() {
            setStopWatchValue(stopWatchValue() + 1);
          }
          x = setInterval(incrementStopWatch, 1000);

          //async
          y = setInterval(async () => {
            if (userLat() && userLon()) {
            let differenceLat = Math.abs(userLat() - latitude);
             let differenceLong = Math.abs(userLon() - longitude);
              if (differenceLat !== 0 || differenceLong !== 0) {
                await UpdateUserLocation(userLat(), userLon(), session().user.id);
                setNewCoords(true);
             }
            }
          }, 2000);
        }
        SpeedArray.push(speed * (3600/1000));
        HeadingArray.push(heading);
        setLoopOnce(false);
      }
    }
  }

  onCleanup(() => {
    if (x) clearInterval(x);
    if (y) clearInterval(y);
    if (acl) acl.stop();
  });

  return (
    <section class="bg-emerald-50 md:h-screen mx-auto px-6 py-8">
      <audio id="BottomFeeder" src={BotttomFeader}></audio>
      <audio id="Slay" src={Slay}></audio>
      <audio id="Dominating" src={Dominating}></audio>
      <audio id="WickedSick" src={WickedSick}></audio>
      <div>
        <h1 class="flex justify-center items-center text-3xl font-bold text-black mb-8 mt-16">StopWatch</h1>
        <div class="place-items-center grid h-16 grid-cols-3 text-xl font-bold text-black bg-red-200 rounded-xl ">
          <div><h3>{Math.floor(stopWatchValue() / 3600)} h</h3></div>
          <div><h3>{Math.floor((stopWatchValue() % 3600) / 60)} m</h3></div>
          <div><h3>{stopWatchValue() % 60} s</h3></div>
        </div>
      </div>

      <div>
        <h1 class="flex justify-center items-center text-3xl font-bold text-black mb-8 mt-12">G-Force</h1>
        <div class="place-items-center grid h-16 text-xl font-bold text-black bg-red-200 rounded-xl mx-auto w-50"><h3>{Math.abs((GForce()-0.99)).toFixed(1)} g</h3></div>
      </div>
      <div class="flex flex-center justify-center">
        <div id="map" class="w-95 h-80 min-w-80 max-h-65 rounded-lg mt-16 border-2 border-red-200"></div>
      </div>

      <Show when={countPlayers !== 0}>
        <div class="relative overflow-x-auto shadow-md sm:rounded-lg mt-5 border-2  border-gray-600">
          <table class="w-full text-sm text-left rtl:text-right  text-gray-400">
            <caption class="p-5 text-lg font-semibold text-left rtl:text-right   text-white bg-gray-800">
              Race Leaderboard
            </caption>
            <thead class="text-xs uppercase bg-gray-700 text-white">
              <tr>
                <th scope="col" class="px-6 py-3">Position</th>
                <th scope="col" class="px-6 py-3">Username</th>
                <th scope="col" class="px-6 py-3">Time</th>
                <th scope="col" class="px-6 py-3">Top speed</th>
              </tr>
            </thead>
            <tbody id="LeaderBoardsTable">
            </tbody>
          </table>
        </div>

      </Show>

      <Show when={raceFinished()}>
        <div class="place-items-center">
          <h1 class="mt-8 font-bold text-lg">Track Grade</h1>
          <div class="mt-4 font-semibold"><h3>Average acceleration difference: {CalcAccDif()}</h3></div>
          <div class="mt-4 font-semibold"><h3>Average heading difference: {CalcHeaDif()}</h3></div>
          <div class="mt-4 font-semibold"><h3>Average speed: {CalcSpeAvg()}</h3></div>
          <div class="mt-4 font-semibold"><h3>Maximum speed: {MaxSpeed()}</h3></div>
        </div>

        <div class="justify-center flex flex-center mt-8"><h2>Final Grade, with a factor of - {(TrackHardnessFactor())}</h2></div>
        <Show when={TrackHardnessFactor() <= 97}>
          <div class="place-items-center">
            <img src={EASY} class="w-2/3 mt-4 overflow-hidden rounded-lg"></img>
          </div>
        </Show>
        <Show when={TrackHardnessFactor() > 97 && TrackHardnessFactor() <= 189}>
          <div class="place-items-center">
            <img src={MEDIUM} class="w-2/3 mt-4 overflow-hidden rounded-lg"></img>
          </div>
        </Show>
        <Show when={TrackHardnessFactor() > 189 && TrackHardnessFactor() <= 325}>
          <div class="place-items-center">
            <img src={HARD} class="w-2/3 mt-4 overflow-hidden rounded-lg"></img>
          </div>
        </Show>
        <Show when={TrackHardnessFactor() > 325}>
          <div class="place-items-center">
            <img src={EXTRAHARD} class="w-2/3 mt-4 overflow-hidden rounded-lg"></img>
          </div>
        </Show>

        <div class="place-items-center">
          <p class="mt-16 font-bold text-base">You´r {UserTimeGrade()}x faster than calculated.</p>
          <div id="Badge" class="w-2/3 mt-8 mb-32 self-center rounded-xl overflow-hidden"></div>
        </div>

      </Show>

      <Show when={!inRoom()}>
        <h1 class="mt-16 text-center text-2xl font-bold text-black mb-6">Join a room!</h1>
        <form onSubmit={JoinRoom} class="flex flex-col gap-4">
          <div class="grid place-items-center mt-8">
          <div class="flex flex-col items-center space-y-2">
            <label class="font-bold text-xl mb-2">Room Code:</label>
            <input type="text" name="EnteredRoomCode" required class="p-2 rounded-md max-w-100 border-red-200 border-4" />
          </div>
          </div>
          <button type="submit" class="mt-4 bg-slate-600 text-white p-2 rounded-md w-50 self-center hover:bg-slate-700">
            Join
          </button>
        </form>
        <h1 class="text-center text-2xl font-bold text-black mb-6 mt-24">Or create one!</h1>
        <div class="flex justify-center items-baseline gap-4">
          <button id="CreatButton" onClick={CreateARoom} class="mt-4 bg-slate-600 text-white p-2 rounded-md hover:bg-slate-700">Create</button>
        </div>
      </Show>
      <div class="mt-16 flex justify-center items-baseline gap-4">
        <input type="text" id="ShowRoomCode" class="text-center border-red-200 border-4" placeholder="XXXX-XXXX" disabled="true"></input>
      </div>

      {/*<button id="profile" class="mt-4 bg-slate-600 text-white p-2 rounded-md hover:bg-slate-700">Profile</button>*/}

      <Show when={inRoom()}>
        <div class="flex justify-center">
          <button id="LeaveButton" onClick={LeaveRoom} class="mt-12 bg-slate-600 text-white p-2 rounded-md hover:bg-slate-700">Leave</button>
        </div>
      </Show>
    </section>
  );
}
import OSM from 'ol/source/OSM';
import TileLayer from 'ol/layer/Tile';
import {Map, View} from 'ol';
import {fromLonLat} from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import {circular} from 'ol/geom/Polygon';
import Control from 'ol/control/Control';
import {Fill, Icon, Style} from 'ol/style';
import kompas from 'kompas';
import MultiLineString from 'ol/geom/MultiLineString';
import moment from 'moment/moment';

const map = new Map({
  target: 'map-container',
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
  ],
  view: new View({
    center: fromLonLat([0, 0]),
    zoom: 2,
  }),
});

const source = new VectorSource();
const layer = new VectorLayer({
  source: source,
});
map.addLayer(layer);
let positions = [];
let timedDistance=[];

navigator.geolocation.pos

navigator.geolocation.watchPosition(
  function (pos) {
    const coords = [pos.coords.longitude, pos.coords.latitude];
    const accuracy = circular(coords, pos.coords.accuracy);
    positions.push(coords);    
    if(positions.length>1){     
      const line = new MultiLineString([new Point(fromLonLat(positions[positions.length-2])), new Point(fromLonLat(coords))]);
      let distance = distanceBetweenPoints(positions[positions.length-2],coords);
      console.log("distance:",distance);
      timedDistance.push({distance:distance,time:moment()}); 
      let feature = source.getFeatures().filter(f=>f.name=="point");
      source.removeFeature(feature);
      source.addFeatures([
        new Feature(
          accuracy.transform('EPSG:4326', map.getView().getProjection())
        ),
        /*new Feature({
          geometry:new Point(fromLonLat(positions.length-1)),
          name:"point",
        }),*/
        new Feature({
          geometry: line,
          name: "polyline"
        })
      ]);
    } else{
      timedDistance.push({distance:0,time:moment()}); 
    }
  },
  function (error) {
    alert(`ERROR: ${error.message}`);
  },
  {
    enableHighAccuracy: true,
  }
);

function distanceBetweenPoints(point1, point2){
  const dx = point1[0] - point2[0];
  const dy = point1[1] - point2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

const locate = document.createElement('div');
locate.className = 'ol-control ol-unselectable locate';
locate.innerHTML = '<button title="Locate me">◎</button>';
locate.addEventListener('click', function () {
  if (!source.isEmpty()) {
    map.getView().fit(source.getExtent(), {
      maxZoom: 18,
      duration: 500,
    });
  }
});
map.addControl(
  new Control({
    element: locate,
  })
);
const stats = document.createElement('div');
stats.className = 'ol-control ol-unselectable stats';
stats.innerHTML = '<button title="Stats">Stats</button>';
stats.addEventListener('click', function () {
  if (timedDistance.length>1) {
    let totalDistance = timedDistance.reduce((prev,curr)=> ({distance:prev.distance + curr.distance, time:curr.time}),{distance:0,time:moment().add(-2,"seconds")});
    let speeds = timedDistance.map((el,i,arr)=>{
      if(i==0) return 0;
      return el.distance/el.time.diff(arr[i-1].time,"seconds");
    });
    let avgSpeed = speeds.reduce((prev,curr)=> prev+curr,0)/speeds.length;
    alert(`Total distance is: ${totalDistance.distance} meters /n Average speed is : ${avgSpeed}`);
  }
});
map.addControl(
  new Control({
    element: stats,
  })
);


const style = new Style({
  fill: new Fill({
    color: 'rgba(0, 0, 255, 0.2)',
  })
});
layer.setStyle(style);

function startCompass() {
  kompas()
    .watch()
    .on('heading', function (heading) {
      style.getImage().setRotation((Math.PI / 180) * heading);
    });
}

if (
  window.DeviceOrientationEvent &&
  typeof DeviceOrientationEvent.requestPermission === 'function'
) {
  locate.addEventListener('click', function () {
    DeviceOrientationEvent.requestPermission()
      .then(startCompass)
      .catch(function (error) {
        alert(`ERROR: ${error.message}`);
      });
  });
} else if ('ondeviceorientationabsolute' in window) {
  startCompass();
} else {
  alert('No device orientation provided by device');
}

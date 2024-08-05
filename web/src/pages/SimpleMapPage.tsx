import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { useWS } from "../hooks/useWS.ts";
// @ts-ignore
import centroid from "@turf/centroid";
import type { Feature } from 'geojson';
import { FeatureCollection, LineString, Position } from "geojson";
import { useEffect, useMemo, useState } from "react";
import Map, { Layer, Source } from 'react-map-gl';
import DrawControl from "../components/DrawControl.tsx";
import { Spinner } from "../components/Spinner.tsx";
import { useConfig } from "../hooks/useConfig.tsx";
import { useEnv } from "../hooks/useEnv.tsx";
import { useHighLevelStatus } from "../hooks/useHighLevelStatus.ts";
import { useSettings } from "../hooks/useSettings.ts";
import { AbsolutePose, MapArea, Map as MapType, MarkerArray, Path } from "../types/ros.ts";
import { converter, drawLine, transpose } from "../utils/map.tsx";
import { MapStyle } from "./MapStyle.tsx";


export const SimpleMapPage = () => {
    const highLevelStatus = useHighLevelStatus()
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);

    const {settings} = useSettings()
    const [labelsCollection, setLabelsCollection] = useState<FeatureCollection>({
        type: "FeatureCollection",
        features: []
    })
    const {config} = useConfig(["gui.map.offset.x", "gui.map.offset.y"])
    const envs = useEnv()
    const [tileUri, setTileUri] = useState<string | undefined>()
    const [editMap, setEditMap] = useState<boolean>(false)
    const [features, setFeatures] = useState<Record<string, Feature>>({});
    const [mapKey, setMapKey] = useState<string>("origin")
    const [map, setMap] = useState<MapType | undefined>(undefined)
    const [path, setPath] = useState<MarkerArray | undefined>(undefined)
    const [plan, setPlan] = useState<Path | undefined>(undefined)
    const mowingToolWidth = parseFloat(settings["OM_TOOL_WIDTH"] ?? "0.13") * 100;
    const poseStream = useWS<string>(() => {
            console.log({
                message: "Pose Stream closed",
            })
        }, () => {
            console.log({
                message: "Pose Stream connected",
            })
        },
        (e) => {
            const pose = JSON.parse(e) as AbsolutePose
            const mower_lonlat = transpose(offsetX, offsetY, datum, pose.Pose?.Pose?.Position?.Y!!, pose.Pose?.Pose?.Position?.X!!)
            setFeatures(oldFeatures => {
                let orientation = pose.MotionHeading!!;
                const line = drawLine(offsetX, offsetY, datum, pose.Pose?.Pose?.Position?.Y!!, pose.Pose?.Pose?.Position?.X!!, orientation);
                return {
                    ...oldFeatures, mower: {
                        id: "mower",
                        type: "Feature",
                        properties: {
                            "color": "#00a6ff",
                        },
                        geometry: {
                            coordinates: mower_lonlat,
                            type: "Point",
                        }
                    }, ['mower-heading']: {
                        id: "mower-heading",
                        type: "Feature",
                        properties: {
                            "color": "#ff0000",
                        },
                        geometry: {
                            coordinates: [mower_lonlat, line],
                            type: "LineString",
                        }
                    }
                }
            })
        });

    const mapStream = useWS<string>(() => {
            console.log({
                message: "MAP Stream closed",
            })
        }, () => {
            console.log({
                message: "MAP Stream connected",
            })
        },
        (e) => {
            let parse = JSON.parse(e) as MapType;
            setMap(parse)
            setMapKey("live")
        });

    const pathStream = useWS<string>(() => {
            console.log({
                message: "PATH Stream closed",
            })
        }, () => {
            console.log({
                message: "PATH Stream connected",
            })
        },
        (e) => {
            let parse = JSON.parse(e) as MarkerArray;
            setPath(parse)
        });
    const planStream = useWS<string>(() => {
            console.log({
                message: "PLAN Stream closed",
            })
        }, () => {
            console.log({
                message: "PLAN Stream connected",
            })
        },
        (e) => {
            let parse = JSON.parse(e) as Path;
            setPlan(parse)
        });
    const mowingPathStream = useWS<string>(() => {
            console.log({
                message: "Mowing PATH Stream closed",
            })
        }, () => {
            console.log({
                message: "Mowing PATH Stream connected",
            })
        },
        (e) => {
            const mowingPaths = JSON.parse(e) as Path[];
            setFeatures(oldFeatures => {
                const newFeatures = {...oldFeatures};
                mowingPaths.forEach((mowingPath, index) => {
                    if (mowingPath?.Poses) {
                        newFeatures["mowingPath-" + index] = {
                            id: "mowingPath-" + index,
                            type: 'Feature',
                            properties: {
                                color: `rgba(107, 255, 188, 0.68)`,
                                width: mowingToolWidth,
                            },
                            geometry: {
                                coordinates: mowingPath.Poses.map((pose) => {
                                    return transpose(offsetX, offsetY, datum, pose.Pose?.Position?.Y!, pose.Pose?.Position?.X!)
                                }),
                                type: "LineString"
                            }
                        };
                    }
                })
                return newFeatures
            })
        });

    const joyStream = useWS<string>(() => {
            console.log({
                message: "Joystick Stream closed",
            })
        }, () => {
            console.log({
                message: "Joystick Stream connected",
            })
        },
        () => {
        });

    useEffect(() => {
        if (envs) {
            setTileUri(envs.tileUri)
        }
    }, [envs]);

    useEffect(() => {
        let offX = parseFloat(config["gui.map.offset.x"] ?? 0);
        let offY = parseFloat(config["gui.map.offset.y"] ?? 0);
        if (!isNaN(offX)) {
            setOffsetX(offX)
        }
        if (!isNaN(offY)) {
            setOffsetY(offY)
        }
    }, [config]);

    useEffect(() => {
        if (editMap) {
            mapStream.stop()
            poseStream.stop()
            pathStream.stop()
            planStream.stop()
            mowingPathStream.stop()
            highLevelStatus.stop()
            setPath(undefined)
            setPlan(undefined)
        } else {
            if (settings["OM_DATUM_LONG"] == undefined || settings["OM_DATUM_LAT"] == undefined) {
                return
            }
            highLevelStatus.start("/api/openmower/subscribe/highLevelStatus")
            poseStream.start("/api/openmower/subscribe/pose",)
            mapStream.start("/api/openmower/subscribe/map",)
            pathStream.start("/api/openmower/subscribe/path")
            planStream.start("/api/openmower/subscribe/plan")
            mowingPathStream.start("/api/openmower/subscribe/mowingPath")
        }
    }, [editMap])
    useEffect(() => {
        if (highLevelStatus.highLevelStatus.StateName == "AREA_RECORDING") {
            joyStream.start("/api/openmower/publish/joy")
            setEditMap(false)
            return
        }
        joyStream.stop()
    }, [highLevelStatus.highLevelStatus.StateName])

    useEffect(() => {
        if (settings["OM_DATUM_LONG"] == undefined || settings["OM_DATUM_LAT"] == undefined) {
            return
        }
        highLevelStatus.start("/api/openmower/subscribe/highLevelStatus")
        poseStream.start("/api/openmower/subscribe/pose",)
        mapStream.start("/api/openmower/subscribe/map",)
        pathStream.start("/api/openmower/subscribe/path")
        planStream.start("/api/openmower/subscribe/plan")
        mowingPathStream.start("/api/openmower/subscribe/mowingPath")
    }, [settings]);

    useEffect(() => {
        return () => {
            poseStream.stop()
            mapStream.stop()
            pathStream.stop()
            joyStream.stop()
            planStream.stop()
            mowingPathStream.stop()
            highLevelStatus.stop()
        }
    }, [])

    const buildLabels = (param: Feature[]) => {
        return param.flatMap((feature) => {
            if (feature.properties?.title == undefined) {
                return []
            }
            if (feature.geometry.type !== "Polygon") {
                return []
            }
            if (feature.geometry.coordinates.length == 0) {
                return []
            }
            const centroidPt = centroid(feature);
            if (centroidPt.properties != null) {
                centroidPt.properties.title = feature.properties?.title;
                centroidPt.properties.index = feature.properties?.index;
            }
            centroidPt.id = feature.id
            return [centroidPt];
        })
    };
    useEffect(() => {
        let newFeatures: Record<string, Feature> = {}
        if (map) {
            const workingAreas = buildFeatures(map.WorkingArea, "area")
            const navigationAreas = buildFeatures(map.NavigationAreas, "navigation")
            newFeatures = {...workingAreas, ...navigationAreas}
            const labels = buildLabels(Object.values(newFeatures))
            setLabelsCollection({
                type: "FeatureCollection",
                features: labels
            });
            const dock_lonlat = transpose(offsetX, offsetY, datum, map?.DockY!!, map?.DockX!!)
            newFeatures["dock"] = {
                id: "dock",
                type: "Feature",
                properties: {
                    "color": "#ff00f2",
                },
                geometry: {
                    coordinates: dock_lonlat,
                    type: "Point",
                }
            }
        }
        if (path) {
            path.Markers.forEach((marker, index) => {
                const line: Position[] = marker.Points.map(point => {
                    return transpose(offsetX, offsetY, datum, point.Y!!, point.X!!)
                })
                const feature: Feature<LineString> = {
                    id: "path-" + index,
                    type: 'Feature',
                    properties: {
                        color: `rgba(${marker.Color.R * 255}, ${marker.Color.G * 255}, ${marker.Color.B * 255}, ${marker.Color.A * 255})`
                    },
                    geometry: {
                        coordinates: line,
                        type: 'LineString'
                    }
                }
                newFeatures[feature.id as string] = feature
                return feature
            })
        }
        if (plan?.Poses) {
            const feature: Feature<LineString> = {
                id: "plan",
                type: 'Feature',
                properties: {
                    color: `orange`,
                    width: 3,
                },
                geometry: {
                    coordinates: plan.Poses.map((pose) => {
                        return transpose(offsetX, offsetY, datum, pose.Pose?.Position?.Y!, pose.Pose?.Position?.X!)
                    }),
                    type: "LineString"
                }
            }
            newFeatures[feature.id as string] = feature
        }
        setFeatures(newFeatures)
    }, [map, path, plan, offsetX, offsetY]);

    function buildFeatures(areas: MapArea[] | undefined, type: string) {
        return areas?.flatMap((area, index) => {
            if (!area.Area?.Points?.length) {
                return []
            }
            const map = {
                id: type + "-" + index + "-area-0",
                type: 'Feature',
                properties: {
                    "color": type == "navigation" ? "white" : "#01d30d",
                    title: type == "area" ? type + " " + index : undefined,
                    index,
                },
                geometry: {
                    coordinates: [area.Area?.Points?.map((point) => {
                        return transpose(offsetX, offsetY, datum, point.Y!!, point.X!!)
                    })],
                    type: "Polygon"
                }
            } as Feature;
            const obstacles = area.Obstacles?.map((obstacle, oindex) => {
                return {
                    id: type + "-" + index + "-obstacle-" + oindex,
                    type: 'Feature',
                    properties: {
                        "color": "#bf0000",
                    },
                    geometry: {
                        coordinates: [obstacle.Points?.map((point) => {
                            return transpose(offsetX, offsetY, datum, point.Y!!, point.X!!)
                        })],
                        type: "Polygon"
                    }
                } as Feature;
            })
            return [map, ...obstacles ?? []]
        }).reduce((acc, val) => {
            if (val.id == undefined) {
                return acc
            }
            acc[val.id] = val;
            return acc;
        }, {} as Record<string, Feature>);
    }

    const _datumLon = parseFloat(settings["OM_DATUM_LONG"] ?? 0)
    const _datumLat = parseFloat(settings["OM_DATUM_LAT"] ?? 0)
    const [map_ne, map_sw, datum] = useMemo<[[number, number], [number, number], [number, number, number]]>(() => {
        if (_datumLon == 0 || _datumLat == 0) {
            return [[0, 0], [0, 0], [0, 0, 0]]
        }
        const datum: [number, number, number] = [0, 0, 0]
        converter.LLtoUTM(_datumLat, _datumLon, datum)
        const map_center = (map && map.MapCenterY && map.MapCenterX) ? transpose(offsetX, offsetY, datum, map.MapCenterY, map.MapCenterX) : [_datumLon, _datumLat]
        const center: [number, number, number] = [0, 0, 0]
        converter.LLtoUTM(map_center[1], map_center[0], center)
        const map_sw = transpose(offsetX, offsetY, center, -((map?.MapHeight ?? 10) / 2), -((map?.MapWidth ?? 10) / 2))
        const map_ne = transpose(offsetX, offsetY, center, ((map?.MapHeight ?? 10) / 2), ((map?.MapWidth ?? 10) / 2))
        return [map_ne, map_sw, datum]
    }, [_datumLat, _datumLon, map, offsetX, offsetY])

    if (_datumLon == 0 || _datumLat == 0 || !(map_sw?.length && map_ne?.length)) {
        return <Spinner/>
    }
    return (
        <Map key={mapKey}
            reuseMaps
            antialias
            projection={{
                name: "globe"
            }}
            mapboxAccessToken="pk.eyJ1IjoiZmFrZXVzZXJnaXRodWIiLCJhIjoiY2pwOGlneGI4MDNnaDN1c2J0eW5zb2ZiNyJ9.mALv0tCpbYUPtzT7YysA2g"
            initialViewState={{
                bounds: [{lng: map_sw[0], lat: map_sw[1]}, {lng: map_ne[0], lat: map_ne[1]}],
            }}
            style={{width: '100%', height: '100%'}}
            mapStyle={"mapbox://styles/mapbox/satellite-streets-v12"}
        >
            {tileUri ? <Source type={"raster"} id={"custom-raster"} tiles={[tileUri]} tileSize={256}/> : null}
            {tileUri ? <Layer type={"raster"} source={"custom-raster"} id={"custom-layer"}/> : null}
            <Source type={"geojson"} id={"labels"} data={labelsCollection}/>
            <Layer type={"symbol"} id={"mower"} source={"labels"} layout={{
                "text-field": ['get', 'title'], //This will get "t" property from your geojson
                "text-rotation-alignment": "auto",
                "text-allow-overlap": true,
                "text-anchor": "top"
            }} paint={{
                "text-color": "black",
            }}/>
            <DrawControl
                styles={MapStyle}
                userProperties={true}
                features={Object.values(features)}
                position="top-left"
                displayControlsDefault={false}
                editMode={editMap}
                controls={{
                    polygon: true,
                    trash: true
                }}
                defaultMode="simple_select"
            />
        </Map>
    );
}

//SimpleMapPage.whyDidYouRender = true

export default SimpleMapPage;
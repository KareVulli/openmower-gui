import {useEffect, useState} from "react";
import {AbsolutePose} from "../types/ros.ts";
import {useWS} from "./useWS.ts";

export const usePose = () => {
    const [pose, setPose] = useState<AbsolutePose>({})
    const poseStream = useWS<string>(() => {
            console.log({
                message: "POSE Stream closed",

            })
        }, () => {
            console.log({
                message: "POSE Stream connected",
            })
        },
        (e) => {
            setPose(JSON.parse(e))
        })
    useEffect(() => {
        poseStream.start("/api/openmower/subscribe/pose",)
        return () => {
            poseStream.stop()
        }
    }, []);
    return pose;
};
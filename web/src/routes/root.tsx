import {Outlet, useMatches, useNavigate} from "react-router-dom";
import {Layout, Row, Menu, MenuProps} from "antd";
import {
    HeatMapOutlined,
    MessageOutlined,
    RobotOutlined,
    RocketFilled,
    RocketOutlined,
    SettingOutlined
} from '@ant-design/icons';
import {MowerStatus} from "../components/MowerStatus.tsx";
import {useEffect} from "react";

const menu: MenuProps['items'] = [
    {
        key: '/openmower',
        label: 'OpenMower',
        icon: <RobotOutlined/>
    },
    {
        key: '/setup',
        label: 'Setup',
        icon: <RocketOutlined/>
    },
    {
        key: '/settings',
        label: 'Settings',
        icon: <SettingOutlined/>
    },
    {
        key: '/map',
        label: 'Map',
        icon: <HeatMapOutlined/>
    },
    {
        key: '/logs',
        label: 'Logs',
        icon: <MessageOutlined/>
    },
    {
        key: 'new',
        label: <span className={"beamerTrigger"} style={{paddingRight: 30}}>What's new</span>,
        icon: <RocketFilled/>,
    }
];

const Root = () => {
    const route = useMatches()
    const navigate = useNavigate()
    useEffect(() => {
        if (route.length === 1 && route[0].pathname === "/") {
            navigate({
                pathname: '/openmower',
            })
        }
    }, [route, navigate])
    return (
        <>
            <Row
                style={{height: '25px', borderBottom: '1px solid #1677ff', position: "absolute", top: 0, right: 0, zIndex: 100, marginLeft: 50, paddingRight: 10, paddingTop: 2}}>
                <MowerStatus/>
            </Row>
            <Layout style={{height: "100%"}}>
                <Layout.Sider breakpoint="lg"
                            collapsedWidth="0"
                            zeroWidthTriggerStyle={{top: 0}}
                >
                    <Menu theme="dark"
                        mode="inline"
                        onClick={(info) => {
                            if (info.key !== 'new') {
                                navigate({
                                    pathname: info.key,
                                })
                            }
                        }} selectedKeys={route.map(r => r.pathname)} items={menu}/>
                </Layout.Sider>
                <Layout style={{height: "100%"}}>
                    <Layout.Content style={{padding: "10px 24px 0px 24px", height: "100%", backgroundColor: 'white'}}>
                        <Outlet/>
                    </Layout.Content>
                </Layout>
            </Layout>
        </>
    );
}

export default Root;
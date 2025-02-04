"use client";
import Head from "next/head";
import CesiumViewer from "../../components/CesiumViewer";  // Ensure the path is correct

const Home = () => {
  return (
    <div>
      <Head>
        <title>Cesium in Next.js</title>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/cesium/Build/Cesium/Widgets/widgets.css"
        />
      </Head>
      <CesiumViewer />
    </div>
  );
};

export default Home;

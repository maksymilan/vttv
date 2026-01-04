import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.group1}>
        <div className={styles.ellipse4} />
        <div className={styles.ellipse5} />
        <div className={styles.ellipse3} />
        <div className={styles.ellipse8} />
        <div className={styles.ellipse2}>
          <div className={styles.ellipse6} />
        </div>
        <div className={styles.ellipse7} />
        <div className={styles.ellipse9} />
        <div className={styles.ellipse11} />
        <div className={styles.ellipse10} />
      </div>
      <div className={styles.group8}>
        <img src="../image/mjvrmx25-fgt61mi.svg" className={styles.group5} />
        <p className={styles.healink}>Healink</p>
      </div>
      <div className={styles.frame1}>
        <p className={styles.text}>基础版</p>
        <p className={styles.text2}>手机版</p>
        <p className={styles.text3}>联系我们</p>
        <div className={styles.frame3}>
          <p className={styles.english}>English</p>
          <div className={styles.rectangle13} />
          <div className={styles.rectangle14} />
          <div className={styles.rectangle15} />
        </div>
      </div>
      <p className={styles.text4}>上传视频即可开启评估</p>
      <div className={styles.rectangle3}>
        <div className={styles.autoWrapper}>
          <p className={styles.text5}>请上传你的康复视频</p>
          <div className={styles.group29}>
            <div className={styles.rectangle6}>
              <img src="../image/mjvrmx25-5zfhr69.svg" className={styles.camera1} />
              <p className={styles.text6}>上传视频</p>
            </div>
          </div>
        </div>
        <img
          src="../image/mjvrmx25-zo4jqy9.svg"
          className={styles.arrowUpCircleFill1}
        />
      </div>
      <div className={styles.group23}>
        <p className={styles.text}>登出</p>
        <div className={styles.rectangle7}>
          <p className={styles.text7}>用户4251</p>
          <div className={styles.ellipse12}>
            <p className={styles.text8}>用</p>
          </div>
        </div>
      </div>
      <img src="../image/mjvrmx25-8h68nk4.svg" className={styles.group26} />
      <p className={styles.text9}>
        点击或拖拽上传训练视频，Healink 将为你生成康复建议→
      </p>
      <img src="../image/mjvrmx25-wgw80f9.png" className={styles.vector} />
    </div>
  );
}

export default Component;

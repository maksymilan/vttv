import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.rectangle3}>
        <div className={styles.rectangle4}>
          <img src="../image/mjvrlidr-zfxijcq.svg" className={styles.plusBubble1} />
          <p className={styles.text}>开启新评估</p>
        </div>
        <p className={styles.text2}>今天</p>
        <p className={styles.text3}>腰椎康复第 3 天动作感受记录</p>
        <p className={styles.text4}>每次训练后都酸痛</p>
        <p className={styles.text4}>系统建议要避免背弓</p>
        <p className={styles.text5}>7天内</p>
        <p className={styles.text6}>康复建议“核心激活”练习</p>
        <p className={styles.text7}>背部好像比之前更僵硬了？</p>
        <p className={styles.text7}>骨盆中立位改善，训练节奏调整</p>
        <p className={styles.text8}>提示“腰椎代偿”出现了两次</p>
        <p className={styles.text9}>核心未激活导致用户动作幅度不足</p>
        <p className={styles.text10}>30天内</p>
        <p className={styles.text11}>康复建议“核心激活”练习</p>
      </div>
    </div>
  );
}

export default Component;

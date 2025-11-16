import { Text, TextInput } from 'react-native';

export const setDefaultFont = (fontName = 'PlusJakartaSans-Regular') => {
  const oldTextRender = Text.render;
  const oldTextInputRender = TextInput.render;

  Text.render = function (...args) {
    const origin = oldTextRender.call(this, ...args);
    return cloneElement(origin, {
      style: [{ fontFamily: fontName }, origin.props.style],
    });
  };

  TextInput.render = function (...args) {
    const origin = oldTextInputRender.call(this, ...args);
    return cloneElement(origin, {
      style: [{ fontFamily: fontName }, origin.props.style],
    });
  };
};

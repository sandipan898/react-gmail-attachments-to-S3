import React, { Component } from 'react';

export default class CheckboxRenderer extends Component {
  constructor(props) {
    super(props);
    this.checkedHandler = this.checkedHandler.bind(this);
  }

  checkedHandler(event) {
	console.log("event >> ",event, this.props);
	event.persist();
    let checked = event.target.checked;
    let colId = this.props.column.colId;
    this.props.node.setDataValue(colId, checked);
  }

  render() {
    return (
      <input 
        type="checkbox" 
        onChange={this.checkedHandler}
        checked={this.props.value}
      />
    )
  }
}
import React from 'react';
import './Card.css'; // Make sure to create a Card.css file with the styling

const Card = ({ header, headerActions, children }) => {
  // Join the list of button html together with a space
  return (
    <div className="card">
      <table className="card-table">
        <thead>
          <tr>
            <th><div className="card-header">
                <span className="card-title">{header}</span>
                <span className="card-actions">{headerActions}</span>
            </div></th>
          </tr>
        </thead>
        <tbody className="card-body">
          <tr>
            <td className="body-content">{children}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Card;
